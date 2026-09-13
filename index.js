require("dotenv").config();

const {
    Client,
    GatewayIntentBits
} = require("discord.js");

const { createClient } = require("@supabase/supabase-js");

const TOKEN = process.env.TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FARM_CHANNEL_ID = process.env.FARM_CHANNEL_ID || "1545465192719327292";

if (!TOKEN) {
    throw new Error("Missing TOKEN environment variable");
}

if (!SUPABASE_URL) {
    throw new Error("Missing SUPABASE_URL environment variable");
}

if (!SUPABASE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
}

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    }
);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

function formatFarmId(id) {
    return `FARM-${String(id).padStart(3, "0")}`;
}

function thaiDate(value) {
    if (!value) return "-";

    return new Date(value).toLocaleString("th-TH", {
        timeZone: "Asia/Bangkok"
    });
}

async function getFarm(id) {
    const { data, error } = await supabase
        .from("farms")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) throw error;

    return data;
}

async function sendLongMessage(message, text) {
    const chunks = [];
    let current = "";

    for (const block of text.split("\n\n")) {
        const candidate = current
            ? `${current}\n\n${block}`
            : block;

        if (candidate.length > 1900) {
            if (current) chunks.push(current);
            current = block;
        } else {
            current = candidate;
        }
    }

    if (current) chunks.push(current);

    if (chunks.length === 0) return;

    await message.reply(chunks[0]);

    for (let i = 1; i < chunks.length; i++) {
        await message.channel.send(chunks[i]);
    }
}

client.once("ready", async () => {
    console.log(`Bot Online : ${client.user.tag}`);

    try {
        const { data, error } = await supabase
            .from("farms")
            .select("id")
            .order("id", { ascending: false })
            .limit(1);

        if (error) throw error;

        const latest = data?.[0]?.id ?? 0;

        console.log(`Supabase connected. Latest FARM ID: ${latest}`);
    } catch (error) {
        console.error("Supabase connection check failed:", error);
    }
});

client.on("messageCreate", async message => {
    if (message.author.bot) return;

    const args = message.content.trim().split(/\s+/);
    const cmd = (args[0] || "").toLowerCase();

    try {
        // ตรวจฐานข้อมูลโดยไม่สร้างงานใหม่
        if (cmd === "!dbcheck") {
            const { count, error: countError } = await supabase
                .from("farms")
                .select("*", { count: "exact", head: true });

            if (countError) throw countError;

            const { data, error } = await supabase
                .from("farms")
                .select("id, customer, roblox, status")
                .order("id", { ascending: false })
                .limit(1);

            if (error) throw error;

            const latest = data?.[0];

            return message.reply(
`✅ SUPABASE CONNECTED

จำนวน FARM ทั้งหมด:
${count ?? 0}

FARM ล่าสุด:
${latest ? formatFarmId(latest.id) : "-"}

Roblox:
${latest?.roblox || "-"}

สถานะ:
${latest?.status || "-"}`
            );
        }

        // สร้างงานฟาร์ม
        if (cmd === "!addfarm") {
            const { data, error } = await supabase
                .from("farms")
                .insert({
                    customer: "",
                    roblox: "",
                    hours: 0,
                    start_at: null,
                    end_at: null,
                    status: "waiting"
                })
                .select()
                .single();

            if (error) throw error;

            return message.reply(
`🌾 FARM CREATED

เลขงาน: #${data.id}
(${formatFarmId(data.id)})

สถานะ:
🟡 รอกรอกข้อมูล

ใช้:
!editfarm ${data.id}`
            );
        }

        // แก้ข้อมูลฟาร์ม
        if (cmd === "!editfarm") {
            const id = Number(args[1]);

            if (!Number.isInteger(id)) {
                return message.reply(
                    "❌ รูปแบบ: !editfarm <เลขงาน> <TikTok> <Roblox> <ชั่วโมง>"
                );
            }

            const farm = await getFarm(id);

            if (!farm) {
                return message.reply("❌ ไม่พบ FARM ID");
            }

            const customer = args[2] || "";
            const roblox = args[3] || "";
            const hours = Number(args[4]) || 1;

            const { error } = await supabase
                .from("farms")
                .update({
                    customer,
                    roblox,
                    hours
                })
                .eq("id", id);

            if (error) throw error;

            return message.reply(
`✅ อัปเดต FARM #${id}

TikTok:
${customer}

Roblox:
${roblox}

เวลา:
${hours} ชั่วโมง`
            );
        }

        // เริ่มฟาร์ม
        if (cmd === "!startfarm") {
            const id = Number(args[1]);

            if (!Number.isInteger(id)) {
                return message.reply("❌ รูปแบบ: !startfarm <เลขงาน>");
            }

            const farm = await getFarm(id);

            if (!farm) {
                return message.reply("❌ ไม่พบ FARM ID");
            }

            const now = new Date();
            const end = new Date(
                now.getTime() + farm.hours * 60 * 60 * 1000
            );

            const { error } = await supabase
                .from("farms")
                .update({
                    start_at: now.toISOString(),
                    end_at: end.toISOString(),
                    status: "running"
                })
                .eq("id", id);

            if (error) throw error;

            return message.reply(
`
🥚 **${formatFarmId(id)}** 🥚

\`\`\`
TikTok:
${farm.customer}

ชื่อ Roblox:
${farm.roblox}

สถานะ ฟาร์ม:
🔵 กำลังฟาร์ม

แพ็กเกจ:
${farm.hours} ชั่วโมง

เริ่มงาน:
${thaiDate(now)}

กำหนดเสร็จ:
${thaiDate(end)}

⏳ เวลาจะนับตั้งแต่ร้านเริ่มฟาร์มจริงเท่านั้น
\`\`\`
`
            );
        }

        // =====================================================
// ต่อเวลาฟาร์ม
// ใช้: !extendfarm <FARM ID> <จำนวนชั่วโมง>
// ตัวอย่าง: !extendfarm 168 12
// =====================================================
if (cmd === "!extendfarm") {

    const id = Number(args[1]);
    const extraHours = Number(args[2]);

    if (!Number.isInteger(id) || id <= 0 || !Number.isFinite(extraHours) || extraHours <= 0) {
        return message.reply(
`❌ รูปแบบคำสั่งไม่ถูกต้อง

ใช้:
!extendfarm <เลขงาน> <จำนวนชั่วโมง>

ตัวอย่าง:
!extendfarm 168 12`
        );
    }

    const { data: farm, error: findError } = await supabase
        .from("farms")
        .select("id, roblox, hours, start_at, end_at, status")
        .eq("id", id)
        .single();

    if (findError || !farm) {
        console.error("EXTEND FARM FIND ERROR:", findError);
        return message.reply("❌ ไม่พบ FARM ID นี้");
    }

    if (farm.status !== "running" || !farm.end_at) {
        return message.reply(
`❌ FARM-${String(id).padStart(3, "0")} ยังไม่ได้กำลังฟาร์ม

คำสั่ง !extendfarm ใช้ได้เฉพาะงานที่กำลังฟาร์มอยู่เท่านั้น`
        );
    }

    const oldEnd = new Date(farm.end_at);

    if (Number.isNaN(oldEnd.getTime())) {
        return message.reply("❌ เวลาสิ้นสุดของงานนี้ไม่ถูกต้อง");
    }

    // ป้องกันการต่อเวลาหลังงานหมดเวลาแล้ว
    if (oldEnd.getTime() <= Date.now()) {
        return message.reply(
`❌ FARM-${String(id).padStart(3, "0")} หมดเวลาแล้ว

ไม่สามารถใช้ !extendfarm กับงานที่หมดเวลาแล้วได้`
        );
    }

    const oldHours = Number(farm.hours) || 0;
    const totalHours = oldHours + extraHours;

    // สำคัญ: เพิ่มจาก "เวลาสิ้นสุดเดิม" ไม่ใช่จากเวลาที่กดคำสั่ง
    const newEnd = new Date(
        oldEnd.getTime() + extraHours * 60 * 60 * 1000
    );

    const { error: updateError } = await supabase
        .from("farms")
        .update({
            hours: totalHours,
            end_at: newEnd.toISOString()
        })
        .eq("id", id);

    if (updateError) {
        console.error("EXTEND FARM UPDATE ERROR:", updateError);
        return message.reply("❌ ต่อเวลาฟาร์มไม่สำเร็จ กรุณาลองใหม่");
    }

    return message.reply(
`⏰ **ต่อเวลาฟาร์มสำเร็จ**

🥚 **FARM-${String(id).padStart(3, "0")}**

Roblox:
${farm.roblox || "-"}

เวลาเดิม:
${oldHours} ชั่วโมง

เพิ่มเวลา:
+${extraHours} ชั่วโมง

แพ็กเกจรวม:
${totalHours} ชั่วโมง

กำหนดเสร็จใหม่:
${newEnd.toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok"
})}

✅ ระบบต่อเวลาจากกำหนดเสร็จเดิมเรียบร้อย`
    );
}

        
        // ดูรายการฟาร์ม
        if (cmd === "!farmlist") {
            const { data, error } = await supabase
                .from("farms")
                .select("id, roblox, hours, status")
                .order("id", { ascending: true });

            if (error) throw error;

            if (!data || data.length === 0) {
                return message.reply("ไม่มีรายการฟาร์ม");
            }

            let text = "🌾 FARM LIST\n\n";

            for (const farm of data) {
                text +=
`#${farm.id}
Roblox: ${farm.roblox || "-"}
เวลา: ${farm.hours}ชม.
สถานะ: ${farm.status}

`;
            }

            return sendLongMessage(message, text);
        }

        // หยุดฟาร์ม
        if (cmd === "!stopfarm") {
            const id = Number(args[1]);

            if (!Number.isInteger(id)) {
                return message.reply("❌ รูปแบบ: !stopfarm <เลขงาน>");
            }

            const farm = await getFarm(id);

            if (!farm) {
                return message.reply("❌ ไม่พบ FARM ID");
            }

            const { error } = await supabase
                .from("farms")
                .update({ status: "stopped" })
                .eq("id", id);

            if (error) throw error;

            return message.reply(
`🔴 FARM STOPPED

งาน #${id} หยุดแล้ว`
            );
        }
    } catch (error) {
        console.error(`Command error (${cmd}):`, error);

        return message.reply(
            "❌ ระบบฐานข้อมูลมีปัญหาชั่วคราว กรุณาลองใหม่อีกครั้ง"
        ).catch(() => {});
    }
});

// ตรวจสอบงานหมดเวลาทุก 1 นาที
setInterval(async () => {
    try {
        const now = new Date().toISOString();

        const { data: dueFarms, error } = await supabase
            .from("farms")
            .select("*")
            .eq("status", "running")
            .lte("end_at", now);

        if (error) throw error;

        if (!dueFarms || dueFarms.length === 0) {
            return;
        }

        for (const farm of dueFarms) {
            // อัปเดตแบบมีเงื่อนไข เพื่อกันแจ้งซ้ำ
            const { data: completedRows, error: updateError } = await supabase
                .from("farms")
                .update({ status: "completed" })
                .eq("id", farm.id)
                .eq("status", "running")
                .select();

            if (updateError) {
                console.error(
                    `Cannot complete FARM #${farm.id}:`,
                    updateError
                );
                continue;
            }

            if (!completedRows || completedRows.length === 0) {
                continue;
            }

            const channel = client.channels.cache.get(FARM_CHANNEL_ID);

            if (channel) {
                await channel.send(
`
🥚 **${formatFarmId(farm.id)}** 🥚

\`\`\`
TikTok:
${farm.customer}

ชื่อ Roblox:
${farm.roblox}

สถานะ:
✅ ฟาร์มเสร็จเรียบร้อยครับ!

แพ็กเกจ:
${farm.hours} ชั่วโมง

เริ่มงาน:
${thaiDate(farm.start_at)}

เสร็จงาน:
${thaiDate(farm.end_at)}

ระบบหยุด:
0 นาที

ชดเชย:
0 นาที

เวลาฟาร์มจริงครบ ${farm.hours} ชั่วโมง ✅

ขอบคุณที่ใช้บริการ Axbim Shop
\`\`\`
`
                );
            }

            console.log(`FARM #${farm.id} COMPLETE`);
        }
    } catch (error) {
        console.error("Farm timer check failed:", error);
    }
}, 60000);

client.login(TOKEN);
