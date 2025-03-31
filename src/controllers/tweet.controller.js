import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;
    if (!content.trim()) {
        throw new ApiError(400, "Tweet content cannot be empty");
    }

    const newTweet = await Tweet.create({
        content,
        owner: req.user._id, // Assuming user is authenticated and available in req.user
    });

    return res.status(201).json(new ApiResponse(201, newTweet, "Tweet created successfully"));
})

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    const userTweets = await Tweet.find({ owner: userId }).sort({ createdAt: -1 });
    return res.status(200).json(new ApiResponse(200, userTweets, "User tweets fetched successfully"));
})

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    const tweet = await Tweet.findOneAndUpdate(
        { _id: tweetId, owner: req.user._id },
        { content },
        { new: true }
    );

    if (!tweet) {
        throw new ApiError(404, "Tweet not found or unauthorized to update");
    }

    return res.status(200).json(new ApiResponse(200, tweet, "Tweet updated successfully"));
})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    const deletedTweet = await Tweet.findOneAndDelete({ _id: tweetId, owner: req.user._id });
    if (!deletedTweet) {
        throw new ApiError(404, "Tweet not found or unauthorized to delete");
    }

    return res.status(200).json(new ApiResponse(200, {}, "Tweet deleted successfully"));
})

export { 
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
