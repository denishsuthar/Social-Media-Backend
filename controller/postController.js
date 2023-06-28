import catchAsyncError from "../middelware/catchAsyncError.js";
import ErrorHandler from "../utils/errorHandler.js";
import { Post } from "../model/postModel.js";
import { User } from "../model/userModel.js";
import cloudinary from "cloudinary";
import getDataUri from "../utils/dataUri.js"
import ApiFeatures from "../utils/apiFeature.js";

// Add Post
export const createPost = catchAsyncError(async(req,res,next)=>{
    const {title, description} = req.body
    const file = req.file
    if(!title || !description ) return next(new ErrorHandler("Please Fill All Fields", 400));

    const fileUri = getDataUri(file);
    const myCloud = await cloudinary.v2.uploader.upload(fileUri.content, {
        folder:"posts"
    });

    const post = await Post.create({
        title,
        description,
        image:{
            public_id:myCloud.public_id,
            url:myCloud.secure_url,
        },
        author:req.user.id
    })

    const user = await User.findById(req.user.id);
    user.posts.push(post._id)

    await user.save()

    res.status(201).json({
        success:true,
        post
    })
})



// All Posts Infinite Paginated
export const allPosts = catchAsyncError(async (req, res, next) => {
    const skip = req.query.skip && /^\d+$/.test(req.query.skip) ? Number(req.query.skip) : 0;
    const searchQuery = req.query.search || '';
  
    const query = {};
  
    if (searchQuery) {
      query.$or = [
        { title: { $regex: searchQuery, $options: 'i' } },
        { content: { $regex: searchQuery, $options: 'i' } },
      ];
    }
  
    const posts = await Post.find(query, undefined, { skip, limit: 5 })
      .sort({ _id: -1 })
      .populate('author', 'name userName avatar');
  
    res.status(200).json({
      posts,
    });
});

  // export const allPosts = catchAsyncError(async(req,res,next)=>{
//     const skip =  req.query.skip && /^\d+$/.test(req.query.skip) ? Number(req.query.skip) : 0
//     const posts = await Post.find({}, undefined, {skip, limit:5}).sort({ _id: -1 }).populate("author", "name userName avatar")
//     res.status(200).json({
//         posts
//     })
// })
  

// Get User Posts (My Posts)
export const myPosts = catchAsyncError(async(req,res,next)=>{
    const author = req.user.id
    const resultPerPage = 8;
    const postCount = await Post.countDocuments();

    const apiFeature = new ApiFeatures(Post.find({author}).populate("author", "name userName avatar").sort({ _id: -1 }), req.query)
        .search()

    let post = await apiFeature.query.clone();

    apiFeature.pagination(resultPerPage);

    post = await apiFeature.query;

    res.status(200).json({
        success: true,
        post,
        postCount,
        resultPerPage,
    });
})

// Delete Post
export const deletePost = catchAsyncError(async (req, res, next) => {
    const postId = req.params.id;
    
    const post = await Post.findById(postId);
    if (!post) {
      return next(new ErrorHandler("Post not found", 404));
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }
  
    if(post.author.toString() !== req.user.id){
        return next(new ErrorHandler("You are not authorized to delete this post", 401))
    }
  
    const postIndex = user.posts.indexOf(postId);
    if (postIndex !== -1) {
      user.posts.splice(postIndex, 1);
    }

    // Deleting Image Cloudinary
    const imageId = post.image.public_id;
    await cloudinary.v2.uploader.destroy(imageId);

    await user.save();
  
    await post.deleteOne();
  
    res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  });

// View Post
export const viewPost = catchAsyncError(async(req,res,next)=>{
    const post = await Post.findById(req.params.id).populate("author", "name userName avatar")
    if(!post) return next(new ErrorHandler("Post Not Found", 404));
    res.status(200).json({
        success:true,
        post
    })
})

// Like & Dislike Post
export const likeAndUnlikePost = catchAsyncError(async(req,res,next)=>{
    const post = await Post.findById(req.params.id);
    if(!post) return next(new ErrorHandler("Post Not Found", 404))

    if(post.likes.includes(req.user.id)){
        const index = post.likes.indexOf(req.user.id);
        post.likes.splice(index, 1);
        await post.save();
        return res.status(200).json({
            success:true,
            message:"Post Unliked"
        })
    }
    else{
        post.likes.push(req.user.id)
        await post.save();
    }
    res.status(200).json({
        success:true,
        message:"Post Liked"
    })
})

// Update Post
export const updatePost = catchAsyncError(async(req,res,next)=>{
    const {title, description} = req.body
    const file = req.file
    const post = await Post.findById(req.params.id);
    if(!post) return next(new ErrorHandler("Post Not Found", 404))

    if(post.author.toString() !== req.user.id){
        return next(new ErrorHandler("You are not authorized to Update this post", 401))
    }

    if(title) post.title = title;
    if(description) post.description = description;
    if (file) {
        const fileUri = getDataUri(file);
        const myCloud = await cloudinary.v2.uploader.upload(fileUri.content, {
          folder: "posts",
        });
        await cloudinary.v2.uploader.destroy(post.image.public_id);
        post.image = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }

    await post.save();

    res.status(200).json({
        success:true,
        message:"Post Updated Successfully",
        post
    })
})

// Get Infinite Posts Of Following
export const getPostOfFollowing = catchAsyncError(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    const skip = req.query.skip && /^\d+$/.test(req.query.skip) ? Number(req.query.skip) : 0;
    const searchQuery = req.query.search || '';
  
    const query = {
      author: { $in: user.following },
    };
  
    if (searchQuery) {
      query.$or = [
        { title: { $regex: searchQuery, $options: 'i' } },
        { content: { $regex: searchQuery, $options: 'i' } },
      ];
    }
  
    const posts = await Post.find(query, undefined, { skip, limit: 5 })
      .sort({ _id: -1 })
      .populate('author', 'name userName avatar');
  
    res.status(200).json({
      success: true,
      posts,
    });
});

// Add & Update Comment
export const commentOnPost = catchAsyncError(async(req,res,next)=>{
    const post = await Post.findById(req.params.id);
    if(!post) return next(new ErrorHandler("Post Not Found", 404))

    let commentIndex = -1;

    // Checking if Comment Already Exists
    post.comments.forEach((item, index) =>{
        if(item.user.toString() === req.user.id.toString()){
            commentIndex = index;
        }
    })

    if (commentIndex !== -1) {
        post.comments[commentIndex].comment = req.body.comment;
        await post.save();
        return res.status(200).json({
            success:true,
            message:"Comment Updated"
        }) 
    } else {
        post.comments.push({
            user:req.user.id,
            comment:req.body.comment
        })
    }
    await post.save();

    res.status(200).json({
        success:true,
        message:"Comment Added"
    })
})

// Delete Comment
export const deleteComment = catchAsyncError(async(req,res,next)=>{
    const post = await Post.findById(req.params.id)
    if(!post) return next(new ErrorHandler("Post Not Found", 404))

    // Checking if Author wants to Delete
    if(post.author.toString() === req.user.id.toString()){
        if(req.body.commentId == undefined){
            return res.status(400).json({
                success:false,
                message:"Comment Id is Required"
            })
        }
        post.comments.forEach((item,index)=>{
            if(item.id.toString() === req.body.commentId.toString()){
                return post.comments.splice(index, 1);
            }
        })
        await post.save();
        
        return res.status(200).json({
            success:true,
            message:"Selected Comment has been Deleted"
        })

    // Delete his own comment

    } else{
        post.comments.forEach((item,index)=>{
            if(item.user.toString() === req.user.id.toString()){
                return post.comments.splice(index, 1)
            }
        })
        await post.save();
        return res.status(200).json({
            success:true,
            message:"Your Comment has been Deleted"
        })
    }
})


// Delete Post of Any User --Admin
export const deletePostAdmin = catchAsyncError(async (req, res, next) => {
    const postId = req.params.id;
  
    const post = await Post.findById(postId);
    if (!post) {
      return next(new ErrorHandler("Post Not Found", 404));
    }
  
    // Deleting Image from Cloudinary
    const imageId = post.image.public_id;
    await cloudinary.v2.uploader.destroy(imageId);
  
    // Remove post from user's posts array
    const authorId = post.author;
    await User.findByIdAndUpdate(authorId, { $pull: { posts: postId } });
  
    await post.deleteOne();
  
    res.status(200).json({
      success: true,
      message: "Post Deleted Successfully",
    });
});