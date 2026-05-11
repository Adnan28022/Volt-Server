const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // 127.0.0.1 use karna localhost se behtar hai
    const conn = await mongoose.connect(process.env.MONGO_URL);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log("❌ MongoDB Connection Error!");
    if (error.message.includes("ECONNREFUSED")) {
      console.log(
        "Tip: Please make sure your local MongoDB server is RUNNING.",
      );
    } else {
      console.log(`Error Detail: ${error.message}`);
    }
    process.exit(1);
  }
};

module.exports = connectDB;
