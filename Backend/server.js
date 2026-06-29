

require("dotenv").config();

const express = require("express");
const app = require("./src/app");
const Port = 3000;
const {connectDB} = require("./src/data/db");






async function startServer(){

try{


      await app.listen(3000,()=>{
    console.log(`Server Started at Port:${Port}`);

    connectDB();
    
})

}

catch(err){
            console.error("Error in starting server",err);
            
}
 

}



startServer();


