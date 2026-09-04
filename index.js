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

});
