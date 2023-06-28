import { User, generateToken } from "../model/userModel.js";
import catchAsyncError from "../middelware/catchAsyncError.js"
import ErrorHandler from "../utils/errorHandler.js"
import sendToken from "../utils/sendToken.js"
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto"
import {generateUniqueUsername, generateUsername} from "../utils/userName.js";
import cloudinary from "cloudinary";
import getDataUri from "../utils/dataUri.js"
import { Post } from "../model/postModel.js";
import ApiFeatures from "../utils/apiFeature.js";

// Register User
export const register = catchAsyncError(async(req, res, next)=>{
    const {name, email, password, mobileNumber} = req.body
    const file = req.file
    if(!name || !email || !password || !mobileNumber || !file) return next(new ErrorHandler("Please Enter All Fields", 400));

    let user = await User.findOne({email})
    if(user) return next(new ErrorHandler("User Already Registered, Please Login", 400));

    const fileUri = getDataUri(file);
    const myCloud = await cloudinary.v2.uploader.upload(fileUri.content, {
        folder:"avatars"
    });

    // Generating & Sending verification token
    const verificationToken = generateToken();
    const verificationUrl = `${req.protocol}://${req.get("host")}/api/v1/verify/${verificationToken}`;

    const message = `Please click the following link to verify your email:\n\n${verificationUrl}\n\nIf you have not requested this email, please ignore it.`;

    await sendEmail({
      email,
      subject: "Verification Email",
      message,
    });

    // Generating UserName
    let userName = generateUsername(name);
    let usernameExists = true;
    let counter = 1;

    while (usernameExists){
        const existingUser = await User.findOne({ userName });
        if (existingUser) {
            userName = generateUniqueUsername(name, counter);
            counter++;
          } else{
            user = await User.create({
                name, 
                email, 
                password, 
                mobileNumber, 
                userName, 
                avatar:{
                  public_id:myCloud.public_id,
                  url:myCloud.secure_url,
                }
            })
            sendToken(res, user, "Registred Successfully, Please Verify your Email", 201)
            usernameExists = false;
          }
    }
})

// Verifying Email Verification Token
export const verifyEmail = catchAsyncError(async(req,res,next)=>{
  const {token} = req.params.token;

    const user = await User.findOneAndUpdate(
        {verificationToken: token, emailVerified: false},
        {$set: { emailVerified: true }, $unset: { verificationToken: 1 }},
        {new: true}
    )
    if(!user) return next(new ErrorHandler("Invalid Token or Email Already Verified", 404))

    res.status(200).json({
        success:true,
        message:"Email Verified Successfully"
    })
})

// Login User with Email or userName
export const login = catchAsyncError(async (req, res, next) => {
  const { email, userName, password } = req.body;

  if ((!email && !userName) || !password) {
    return next(new ErrorHandler("Please Enter All Fields", 400));
  }

  let user;

  if (email) {
    user = await User.findOne({ email }).select("+password");
  } else if (userName) {
    user = await User.findOne({ userName }).select("+password");
  }

  if (!user) {
    return next(new ErrorHandler("Incorrect Email/Username", 401));
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new ErrorHandler("Incorrect Password", 401));
  }

  // Check if the user's Email is verified
  if (!user.emailVerified) {
    return next(new ErrorHandler("Please Verify Your Email to Login", 403));
  }

  sendToken(res, user, `Welcome Back ${user.name}`, 200);
});

// Login with Email Only
// export const login = catchAsyncError(async(req, res, next)=>{
//     const {email, password} = req.body
//     if(!email || !password) return next(new ErrorHandler("Please Enter All Fields", 400))

//     const user = await User.findOne({email}).select("+password")
//     if(!user) return next(new ErrorHandler("Incorrect Email", 401))

//     const isMatch = await user.comparePassword(password);
//     if(!isMatch) return next(new ErrorHandler("Incorrect Password", 401));

//     // Check if the user's Email is verified
//     if(!user.emailVerified){
//         return next(new ErrorHandler("Please Verify Your Email to Login", 403))
//     }

//     sendToken(res, user, `Welcome Back ${user.name}`, 200);
// })

// Logout User
export const logout = catchAsyncError(async(req, res, next)=>{
    res.status(200).cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly:true,
        // secure:true,
        // sameSite:"none"
    }).json({
        success:true,
        message:"Logout SuccessFully"
    })
})

// Forgot Password
export const forgotPassword = catchAsyncError(async(req, res,next)=>{
    const user = await User.findOne({email:req.body.email})
    if(!user) return next(new ErrorHandler("User Not Found", 404));

    // Get ResetPassword Token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    const resetPasswordUrl = `${req.protocol}://${req.get("host")}/api/v1/password/reset/${resetToken}`;

    const message = `Your password reset token is :- \n\n ${resetPasswordUrl} \n\nIf you have not requested this email then, please ignore it.`;

    try {
        await sendEmail({
          email: user.email,
          subject: `Password Recovery`,
          message,
        });
    
        res.status(200).json({
          success: true,
          message: `Email sent to ${user.email} successfully`,
        });
      } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
    
        await user.save({ validateBeforeSave: false });
    
        return next(new ErrorHandler(error.message, 500));
      }
})

// Reset Password
export const resetPassword = catchAsyncError(async(req, res, next)=>{
    // Creating Token Hash
    const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {return next(new ErrorHandler("Reset Password Token is invalid or has been expired",400));
  }

  if (req.body.password !== req.body.confirmPassword) {
    return next(new ErrorHandler("Password is not match", 400));
  }
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  sendToken(res, user, "Password Reset Succesfully", 200)
})

// Get Login User Profile
export const myProfile = catchAsyncError(async(req,res,next)=>{
    const user = await User.findById(req.user.id).populate("posts", "title")
    // Check if the user is verified
    if(!user.emailVerified){
        return next(new ErrorHandler("Please Verify Your Email to Access this Resource", 403))
    }
    res.status(200).json({
        success:true,
        user
    })
})

// Update User Profile
export const updateProfile = catchAsyncError(async(req,res,next)=>{
    const {name, mobileNumber} = req.body
    const file = req.file

    const user = await User.findById(req.user.id);

    if(name) user.name = name;
    if(mobileNumber) user.mobileNumber = mobileNumber;
    if (file) {
      const fileUri = getDataUri(file);
      const myCloud = await cloudinary.v2.uploader.upload(fileUri.content, {
        folder: "avatars",
      });
      await cloudinary.v2.uploader.destroy(user.avatar.public_id);
      user.avatar = {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      };
    }

    await user.save();

    res.status(200).json({
        success:true,
        message:"Profile Updated Successfully",
        user
    })
})

// Update User Password
export const updatePassword = catchAsyncError(async(req, res, next)=>{
    const {oldPassword, newPassword} = req.body
    if(!oldPassword || !newPassword) return next(new ErrorHandler("Please Fill All Fields", 400));

    const user = await User.findById(req.user._id).select("+password");

    const isMatch = await user.comparePassword(oldPassword);
    if(!isMatch) return next(new ErrorHandler("Old Password Incorrect", 400));

    user.password = newPassword;
    
    await user.save();

    res.status(200).json({
        success:true,
        message:"Password Changed Successfully"
    })
})

// Get All Users
export const allUsers = catchAsyncError(async(req,res,next)=>{
    const resultPerPage = 8;

    const apiFeature = new ApiFeatures(User.find().sort({ _id: -1 }), req.query)
        .searchUser()

    let users = await apiFeature.query.clone();

    apiFeature.pagination(resultPerPage);

    users = await apiFeature.query;

    res.status(200).json({
        success: true,
        users,
        resultPerPage,
    });
})

// Get Any User Profile
export const findUser = catchAsyncError(async(req, res, next)=>{
    const user = await User.findById(req.params.id)
    if(!user) return next(new ErrorHandler("User Not Found", 404));
    res.status(200).json({
        success:true,
        user
    })
})

// Update User Role --Admin
export const updateRole = catchAsyncError(async(req, res, next)=>{
    const user = await User.findById(req.params.id);
    if(!user) return next(new ErrorHandler("User Not Found", 404));

    if(user.role === "user") user.role = "admin";
    else user.role = "user";

    await user.save();

    res.status(200).json({
        success:true,
        message:"Role Updated"
    })
})

// Delete User --Admin
export const deleteUser = catchAsyncError(async(req, res, next)=>{

  const userId = req.params.id;

  // Find the user to be deleted
  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorHandler("User Not Found", 404));
  }

  // Delete all post images associated with the user from Cloudinary
  const posts = await Post.find({ author: userId });
  for (const post of posts) {
    const imageId = post.image.public_id;
    await cloudinary.v2.uploader.destroy(imageId);
  }

  // Deleting all posts of the user
  await Post.deleteMany({ author: userId });

  // Find users who are following the deleted user
  const followers = await User.find({ following: userId });

  // Remove the deleted user from followers' following arrays
  for (const follower of followers) {
    follower.following.pull(userId);
    await follower.save();
  }

  // Remove the user from following users' followers arrays
  for (const followeeId of user.following) {
    const followee = await User.findById(followeeId);
    if (followee) {
      followee.followers.pull(userId);
      await followee.save();
    }
  }

  const imageId = user.avatar.public_id;
  await cloudinary.v2.uploader.destroy(imageId);


  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: "User Deleted Successfully",
  });
})

// Follow & Unfollow User
export const followAndUnfollowUser = catchAsyncError(async(req,res,next)=>{

  const userToFollow = await User.findById(req.params.id)
  const loggedInUser = await User.findById(req.user.id)
  if(!userToFollow) return next(new ErrorHandler("User Not Found", 404))

  if(loggedInUser.following.includes(userToFollow.id)){
    const indexFollowing = loggedInUser.following.indexOf(userToFollow.id);
    const indexFollow = userToFollow.followers.indexOf(loggedInUser.id);

    loggedInUser.following.splice(indexFollowing, 1);
    userToFollow.followers.splice(indexFollow, 1)

    await loggedInUser.save();
    await userToFollow.save();

    res.status(200).json({
      success:true,
      message:"User Unfollowed"
    })
  }
  else{
    loggedInUser.following.push(userToFollow.id);
    userToFollow.followers.push(loggedInUser.id);

    await loggedInUser.save();
    await userToFollow.save();

    res.status(200).json({
      success:true,
      message:"User Followed"
    })
  }
})