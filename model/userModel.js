import mongoose from "mongoose";
import validator from "validator";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import crypto from "crypto"

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:[true, "Please Enter Name"]
    },
    userName:{
        type:String,
        required:true,
        unique:true
    },
    email:{
        type:String,
        required:[true, "Please Enter Email"],
        unique:true,
        validate:validator.isEmail
    },
    emailVerified:{
        type:Boolean,
        default:false,
    },
    password:{
        type:String,
        select:false,
        required:[true, "Please Enter Password"],
        minlength:[6, "Password must be at least 6 characters"]
    },
    mobileNumber:{
        type:Number,
        required:[true, "Please Enter Mobile Number"]
    },
    avatar: {
        public_id: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
    },
    posts:[
        {
            type:mongoose.Schema.ObjectId,
            ref:'Post',
        }
    ],
    followers:[
        {
            type:mongoose.Schema.ObjectId,
            ref:'User',
        }
    ],
    following:[
        {
            type:mongoose.Schema.ObjectId,
            ref:'User',
        }
    ],
    role:{
        type:String,
        enum:["user", "admin"],
        default:"user"
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    verificationToken: String,
})

// Token
userSchema.methods.getJWTToken = function(){
    return jwt.sign({_id : this._id}, process.env.JWT_SECRET, {
        expiresIn:"15d"
    })
}

// Hash Password
userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password,10);
    next();
})

//Compare Password
userSchema.methods.comparePassword = async function(password){
    return await bcrypt.compare(password, this.password)
}

// Generating Password Reset Token
userSchema.methods.getResetPasswordToken = function () {
    // Generating Token
    const resetToken = crypto.randomBytes(20).toString("hex");
  
    // Hashing and adding resetPasswordToken to userSchema
    this.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
  
    this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
  
    return resetToken;
  };


// Email Verification Token
export function generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

export const User = mongoose.model("User", userSchema)