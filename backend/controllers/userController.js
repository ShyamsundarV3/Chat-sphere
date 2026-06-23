import User from "../models/userModel.js";
import Post from "../models/postModel.js";
import bcrypt from "bcryptjs";
import generateTokenAndSetCookie from "../utils/helpers/generateTokenAndSetCookie.js";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";

const getUserProfile = async (req, res) => {
     const { query } = req.params;
     try {
        let user;

        if (mongoose.Types.ObjectId.isValid(query)) {
            user = await User.findOne({ _id: query }).select("-password").select("-updatedAt");
        } else {
            user = await User.findOne({ username: query }).select("-password").select("-updatedAt");
        }
        if (!user) return res.status(400).json({ error: "User not found" });

        res.status(200).json(user);
     } catch (error) {
        res.status(500).json({ error: error.message });
        console.log("Error in getting user profile: ", error.message);
     }
};

const signupUser = async (req, res) => {
    try {
        const { name, email, username, password } = req.body;
        const user = await User.findOne({ $or: [{ email }, { username }] });

        if (user) {
            return res.status(400).json({ error: "User already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            name,
            email,
            username,
            password: hashedPassword,
        });
        await newUser.save();
        if (newUser) {
            generateTokenAndSetCookie(newUser._id, res);
            res.status(201).json({
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                username: newUser.username,
                bio: newUser.bio,
                profilePic: newUser.profilePic,
                followers: newUser.followers,
                following: newUser.following,
            });
        } else {
            res.status(400).json({ error: "Invalid user data" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
        console.log("Error in signupUser: ", err.message);
    }
};

const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        const isPasswordCorrect = await bcrypt.compare(password, user?.password || "");
         
        if (!user || !isPasswordCorrect) return res.status(400).json({ error: "Invalid username or password" }); 
        
        generateTokenAndSetCookie(user._id, res);

        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            username: user.username,
            bio: user.bio,
            profilePic: user.profilePic,
            followers: user.followers,
            following: user.following,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
        console.log("Error in loginUser: ", error.message);
    }
};

const logoutUser = (req, res) => {
   try {
        res.cookie("jwt", "", { maxAge: 1 });
        res.status(200).json({ message: "User logged out successfully" });
   } catch (error) {
        res.status(500).json({ error: error.message });
        console.log("Error in logoutUser: ", error.message);
   }
};

const followUnFollowUser = async (req, res) => {
     try {
        const { id } = req.params;
        const userToModify = await User.findById(id);
        const currentUser = await User.findById(req.user._id);

        if (id === req.user._id.toString()) 
            return res.status(400).json({ error: "You cannot follow/unfollow yourself" });
         
        if (!userToModify || !currentUser) return res.status(400).json({ error: "User not found" });
          
        const isFollowing = currentUser.following.includes(id);

        if (isFollowing) {
           await User.findByIdAndUpdate(req.user._id, { $pull: { following: id } });
           await User.findByIdAndUpdate(id, { $pull: { followers: req.user._id } });
           res.status(200).json({ message: "User unfollowed successfully" });
        } else {
           await User.findByIdAndUpdate(req.user._id, { $push: { following: id } });
           await User.findByIdAndUpdate(id, { $push: { followers: req.user._id } });
           res.status(200).json({ message: "User followed successfully" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
        console.log("Error in FollowUnfollow User: ", error.message);
     }
};

const updateUser = async (req, res) => {
    const { name, email, username, password, bio } = req.body;
    let { profilePic } = req.body;
    const userId = req.user._id;
    try {
        let user = await User.findById(userId);
        if (!user) return res.status(400).json({ error: "User not found" });

        if (req.params.id !== userId.toString()) 
            return res.status(400).json({ error: "You cannot update other user's profile" });
            
        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            user.password = hashedPassword;
        }

        if (profilePic) {
			if (user.profilePic) {
				await cloudinary.uploader.destroy(user.profilePic.split("/").pop().split(".")[0]);
			}

			const uploadedResponse = await cloudinary.uploader.upload(profilePic);
			profilePic = uploadedResponse.secure_url;
		}

        user.name = name || user.name;
        user.email = email || user.email;
        user.username = username || user.username;
        user.profilePic = profilePic || user.profilePic;
        user.bio = bio || user.bio;

        user = await user.save();

        await Post.updateMany(
            { "replies.userId": userId },
            {
                $set: {
                    "replies.$[reply].username": user.username,
                    "replies.$[reply].userProfilePic": user.profilePic
                }
            },
            { arrayFilters: [{ "reply.userId": userId }] }
        );

        user.password = null;

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
        console.log("Error in Updating User: ", error.message);
    }
};

const getSuggestedUsers = async (req, res) => {
    try {
        const userId = req.user._id;
        const currentUser = await User.findById(userId).select("following");
        if (!currentUser) {
            return res.status(404).json({ error: "User not found" });
        }

        const suggestedUsers = await User.find({
            _id: { $nin: [...currentUser.following, userId] },
        })
            .select("-password -updatedAt")
            .limit(5);

        res.status(200).json(suggestedUsers);
    } catch (error) {
        res.status(500).json({ error: error.message });
        console.log("Error in getSuggestedUsers: ", error.message);
    }
};

const searchUsers = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || !q.trim()) {
            return res.status(400).json({ error: "Search query is required" });
        }

        const userId = req.user._id;
        const users = await User.find({
            _id: { $ne: userId },
            username: { $regex: q, $options: "i" },
        })
            .select("-password -updatedAt")
            .limit(10);

        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
        console.log("Error in searchUsers: ", error.message);
    }
};

export { signupUser, loginUser, logoutUser, followUnFollowUser, updateUser, getUserProfile, getSuggestedUsers, searchUsers };
