import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = req.query
    
    const matchQuery = {};
    if (query) {
        matchQuery.$or = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } }
        ];
    }
    if (userId && isValidObjectId(userId)) {
        matchQuery.owner = new mongoose.Types.ObjectId(userId);
    }
    
    const videos = await Video.aggregate([
        { $match: matchQuery },
        { $sort: { [sortBy]: sortType === "asc" ? 1 : -1 } },
        { $skip: (page - 1) * limit },
        { $limit: parseInt(limit) },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [{ $project: { fullName: 1, username: 1, avatar: 1 } }]
            }
        },
        { $addFields: { owner: { $first: "$owner" } } }
    ]);
    
    res.status(200).json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    
    if (!req.files?.videoFile || !req.files?.thumbnail) {
        throw new ApiError(400, "Video file and thumbnail are required");
    }
    
    const videoFilePath = req.files.videoFile[0].path;
    const thumbnailPath = req.files.thumbnail[0].path;
    
    const videoUpload = await uploadOnCloudinary(videoFilePath);
    const thumbnailUpload = await uploadOnCloudinary(thumbnailPath);
    
    if (!videoUpload.url || !thumbnailUpload.url) {
        throw new ApiError(500, "Error uploading files to Cloudinary");
    }
    
    const video = await Video.create({
        title,
        description,
        videoFile: videoUpload.url,
        thumbnail: thumbnailUpload.url,
        duration: videoUpload.duration || 0,
        owner: req.user._id
    });
    
    res.status(201).json(new ApiResponse(201, video, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }
    
    const video = await Video.findById(videoId).populate("owner", "fullName username avatar");
    if (!video) {
        throw new ApiError(404, "Video not found");
    }
    
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { watchHistory: video._id } });
    
    res.status(200).json(new ApiResponse(200, video, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const updates = req.body;
    
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }
    
    const video = await Video.findOneAndUpdate({ _id: videoId, owner: req.user._id }, updates, { new: true });
    if (!video) {
        throw new ApiError(403, "Unauthorized or video not found");
    }
    
    res.status(200).json(new ApiResponse(200, video, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }
    
    const video = await Video.findOneAndDelete({ _id: videoId, owner: req.user._id });
    if (!video) {
        throw new ApiError(403, "Unauthorized or video not found");
    }
    
    res.status(200).json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }
    
    const video = await Video.findOne({ _id: videoId, owner: req.user._id });
    if (!video) {
        throw new ApiError(403, "Unauthorized or video not found");
    }
    
    video.isPublished = !video.isPublished;
    await video.save();
    
    res.status(200).json(new ApiResponse(200, video, "Video publish status toggled"));
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
