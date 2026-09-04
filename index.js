require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder
} = require("discord.js");

const fs = require("fs");

const client = new Client({
    intents:[
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});


const FARM_FILE = "./farms.json";


function loadFarms(){
    if(!fs.existsSync(FARM_FILE)){
        fs.writeFileSync(FARM_FILE,"[]");
    }

    return JSON.parse(
        fs.readFileSync(FARM_FILE)
    );
}


function saveFarms(data){
    fs.writeFileSync(
        FARM_FILE,
        JSON.stringify(data,null,2)
    );
}


client.once("ready",()=>{
    console.log(
        `Bot Online : ${client.user.tag}`
    );
});


client.on("messageCreate",async message=>{

    if(message.author.bot) return;


    const args = message.content.split(" ");
    const cmd = args[0].toLowerCase();


    // สร้างงานฟาร์ม
    if(cmd === "!addfarm"){

        let farms = loadFarms();

        let id = farms.length + 1;


        farms.push({

            id:id,

            customer:"",

            roblox:"",

            hours:0,

            start:null,

            end:null,

            status:"waiting"

        });


        saveFarms(farms);


        message.reply(
`🌾 FARM CREATED

เลขงาน: #${id}

สถานะ:
🟡 รอกรอกข้อมูล

ใช้:
!editfarm ${id}`
        );

    }
    // แก้ข้อมูลฟาร์ม
    if(cmd === "!editfarm"){

        let id = Number(args[1]);

        let farms = loadFarms();

        let farm = farms.find(f=>f.id === id);

        if(!farm)
            return message.reply("❌ ไม่พบ FARM ID");


        farm.customer = args[2] || "";
        farm.roblox = args[3] || "";
        farm.hours = Number(args[4]) || 1;


        saveFarms(farms);


        message.reply(
`✅ อัปเดต FARM #${id}

TikTok:
${farm.customer}

Roblox:
${farm.roblox}

เวลา:
${farm.hours} ชั่วโมง`
        );

    }



    // เริ่มฟาร์ม
    if(cmd === "!startfarm"){

        let id = Number(args[1]);

        let farms = loadFarms();

        let farm = farms.find(f=>f.id === id);


        if(!farm)
            return message.reply("❌ ไม่พบ FARM ID");


        let now = new Date();

        let end = new Date(
            now.getTime() + farm.hours * 60 * 60 * 1000
        );


        farm.start = now;
        farm.end = end;
        farm.status = "running";


        saveFarms(farms);



        message.reply(
`🟢 FARM STARTED

เลขงาน:
#${id}

Roblox:
${farm.roblox}

เริ่ม:
${now.toLocaleString("th-TH")}

หมดเวลา:
${end.toLocaleString("th-TH")}`
        );

    }



    // ดูรายการฟาร์ม
    if(cmd === "!farmlist"){

        let farms = loadFarms();


        if(farms.length === 0)
            return message.reply("ไม่มีรายการฟาร์ม");


        let text = "🌾 FARM LIST\n\n";


        farms.forEach(f=>{

            text +=
`#${f.id}
Roblox: ${f.roblox || "-"}
เวลา: ${f.hours}ชม.
สถานะ: ${f.status}

`;

        });


        message.reply(text);

    }



    // หยุดฟาร์ม
    if(cmd === "!stopfarm"){

        let id = Number(args[1]);

        let farms = loadFarms();

        let farm = farms.find(f=>f.id === id);


        if(!farm)
            return message.reply("❌ ไม่พบ FARM ID");


        farm.status="stopped";


        saveFarms(farms);


        message.reply(
`🔴 FARM STOPPED

งาน #${id} หยุดแล้ว`
        );

    }

});

client.login(process.env.TOKEN);
