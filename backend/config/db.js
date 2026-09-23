const mongoose = require("mongoose")

const connectDB = async ()=>{
    try {
        await mongoose.connect(process.env.MONGODB_URI,{
            dbName: "NewsPulse"
        })
        console.log("MongoDB connected successfully!")
    } catch (error) {
        console.error("MongoDB connection faild:")
        console.error(error.message)

        // Stop the application if database connection fails
        process.exit(1);
    }
}

module.exports = connectDB;