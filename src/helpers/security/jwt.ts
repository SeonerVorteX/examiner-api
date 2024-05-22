import moment from "moment";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { UserType } from "../../types/types";
import { getUserById } from "../../models/user";
import { config } from "dotenv";
config();

const JWT_ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_TOKEN_SECRET;

export const generateTokens = async (
    user: UserType
): Promise<{ accessToken: string }> => {
    const jwtId = uuidv4();
    const accessToken = await generateAccessToken(user._id.toString(), jwtId);

    return { accessToken };
};

export const generateAccessToken = async (
    userId: string,
    jwtId: string
): Promise<string> => {
    const payload = {
        userId,
    };

    let token = jwt.sign(payload, JWT_ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
        jwtid: jwtId,
    });

    return token;
};

export const verifyAccessToken = async (token: string): Promise<any> => {
    return new Promise((resolve) => {
        jwt.verify(
            token,
            JWT_ACCESS_TOKEN_SECRET,
            async (err, decoded: DecodedPayload) => {
                if (err) return resolve(false);

                const { userId } = decoded;

                const user = await getUserById(userId).select(
                    "+authentication.accessToken"
                );

                if (user.authentication.accessToken === token) {
                    return resolve(true);
                } else {
                    return resolve(false);
                }
            }
        );
    });
};

interface DecodedPayload extends jwt.JwtPayload {
    userId: string;
}
