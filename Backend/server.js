

require("dotenv").config();

const express = require("express");
const app = require("./src/app");
const PORT = process.env.PORT || 3000;
const {connectDB} = require("./src/data/db");






async function startServer(){

try{


      await app.listen(PORT, "0.0.0.0", () => {

  console.log(`Server running on port ${PORT}`);

    connectDB();
    
})

}

catch(err){
            console.error("Error in starting server",err);
            
}
 

}



startServer();


