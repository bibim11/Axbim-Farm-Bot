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


const farmFile = "./farms.json";


function loadFarms(){

    if(!fs.existsSync(farmFile)){
        fs.writeFileSync(farmFile,"[]");
    }

    return JSON.parse(
        fs.readFileSync(farmFile)
    );

}


function saveFarms(data){

    fs.writeFileSync(
        farmFile,
        JSON.stringify(data,null,2)
    );

}



client.once("ready",()=>{

    console.log(
        `Bot Online : ${client.user.tag}`
    );

});



client.on("messageCreate", async message=>{


    if(message.author.bot) return;



    // เพิ่มงานฟาร์ม

    if(message.content === "!addfarm"){

        const farm = loadFarms();


        const id = farm.length + 1;


        farm.push({

            id:id,

            customer:"รอกรอก",

            tiktok:"",

            roblox:"",

            detail:"",

            time:"",

            status:"waiting",

            created:new Date()

        });


        saveFarms(farm);



        const embed = new EmbedBuilder()

        .setTitle("🌾 FARM CREATED")

        .setDescription(

`เลขงาน: #${id}

สถานะ:
🟡 รอกรอกข้อมูล

ใช้ระบบต่อไปเพื่อเพิ่มข้อมูลลูกค้า`

        )

        .setColor("Green");


        message.reply({
            embeds:[embed]
        });


    }



    // ดูคิว

    if(message.content === "!farm"){

        const farm = loadFarms();


        if(farm.length===0){

            return message.reply(
                "ยังไม่มีงานฟาร์ม"
            );

        }


        let text="";


        farm.forEach(x=>{

            text += 
`
🌾 #${x.id}
สถานะ: ${x.status}
ลูกค้า: ${x.customer}
`;

        });



        const embed = new EmbedBuilder()

        .setTitle("🌾 FARM QUEUE")

        .setDescription(text)

        .setColor("Blue");


        message.reply({
            embeds:[embed]
        });


    }


});



client.login(process.env.TOKEN);
