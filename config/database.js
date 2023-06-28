import mongoose from "mongoose";

const connectDB = () =>{
    mongoose.connect(process.env.MONGO_URI, {
    }).then((data)=>{
        console.log(`MongoDB connected with ${data.connection.host}`);
    }).catch((err)=>{
        console.log(`Cant Connect ${err}`);
    })
}
export default connectDB