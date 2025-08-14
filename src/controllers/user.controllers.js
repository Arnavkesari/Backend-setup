import { asyncHandler } from "../../utils/asynchandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../../utils/Cloudinary.js";
import { ApiResponse } from "../../utils/ApiResponse.js";


const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token");
    }
};

const registerUser =asyncHandler(
async (req, res) => {
    // Get user details from frontend
    const { fullName, email, username, password } = req.body;
    
    // validation
    if([fullName, email, username, password].some((field) => field?.trim() === "")){
        throw new ApiError(400, "All fields are required")
    }
    const existedUser=await User.findOne({
        $or: [{username},{email}]
    })

    // unique user
    if(existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }
    
    // check images
    const avartarLocalPath=req.files?.avatar[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avartarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar=await uploadOnCloudinary(avartarLocalPath)
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }
   
    // Create user object - create entry in db
    const user = await User.create({
        fullName,
        username: username.toLowerCase(),
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    })

    // Remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // Check for user creation
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    // Return response
    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    // Get user credentials from frontend
    const { email, username, password } = req.body;

    // Check if username or email is provided
    if (!username && !email) {
        throw new ApiError(400, "Username or email is required");
    }

    // Find user in database
    const user = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    // Check password
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    // Generate access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    // Get user without password and refreshToken
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    // Cookie options
    const options = {
        httpOnly: true, // sercure only modify
        secure: true
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "User logged in successfully"
            )
        );
});


const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out"))
})


export {registerUser,loginUser,logoutUser}