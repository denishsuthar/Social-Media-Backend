import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
    title:{
        type:String,
        required:[true, "Please Add Title"]
    },
    description:{
        type:String,
        required:[true, "Please Add Description"]
    },
    image: {
        public_id: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
    },
    author:{
        type:mongoose.Schema.ObjectId,
        ref:'User',
        required:true
    },
    likes:[{
        type:mongoose.Schema.ObjectId,
        ref:'User',
    }],
    comments:[
        {
            user:{
                type:mongoose.Schema.ObjectId,
                ref:'User'
            },
            comment:{
                type:String,
                required:true
            }
        }
    ],
    postCreatedAt:{
        type:Date,
        default:Date.now,
    },

})

export const Post = mongoose.model("Post", postSchema)