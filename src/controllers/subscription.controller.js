import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import {Subscription} from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const subscriberId = req.user.id; // Assuming the logged-in user is subscribing

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    if (subscriberId === channelId) {
        throw new ApiError(400, "You cannot subscribe to yourself");
    }

    const existingSubscription = await Subscription.findOne({
        channel: channelId,
        subscriber: subscriberId
    });

    if (existingSubscription) {
        // Unsubscribe
        await Subscription.findByIdAndDelete(existingSubscription._id);
        return res.status(200).json(new ApiResponse(200, {}, "Unsubscribed successfully"));
    } else {
        // Subscribe
        await Subscription.create({ channel: channelId, subscriber: subscriberId });
        return res.status(200).json(new ApiResponse(200, {}, "Subscribed successfully"));
    }
})

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    const subscribers = await Subscription.find({ channel: channelId }).populate("subscriber", "name email");

    res.status(200).json(new ApiResponse(200, subscribers, "Subscribers retrieved successfully"));
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
    const subscriberId = req.user.id;

    const subscriptions = await Subscription.find({ subscriber: subscriberId }).populate("channel", "name email");

    res.status(200).json(new ApiResponse(200, subscriptions, "Subscribed channels retrieved successfully"));
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}