import { Document, Schema, model } from "mongoose";
import { AuthenticationType } from "types/types";

export interface UserType extends Document {
    email: string;
    fullname: string;
    group: string;
    groupName: string;
    authentication?: AuthenticationType;
}

export const UserSchema = new Schema<UserType>({
    email: { type: String, required: true, unique: true },
    fullname: { type: String, required: true },
    group: { type: String, required: true },
    groupName: { type: String, required: true },
    authentication: {
        accessToken: { type: String, select: false },
    },
});

export const UserModel = model<UserType>("User", UserSchema);

// Functions
export const findOrCreateUser = async (email: string, values: Record<string, any>) => {
    const user = await getUserByEmail(email);
    if (user) return user;
    return await createUser({ email, ...values });
};
export const getUserByEmail = (email: string, select?: string) => UserModel.findOne({ email }).select(select);
export const getUserByAccessToken = (accessToken: string, select?: string) =>
    UserModel.findOne({
        "authentication.accessToken": accessToken,
    }).select(select);
export const getUserById = (id: string, select?: string) => UserModel.findById(id).select(select);
export const createUser = (values: Record<string, any>) => new UserModel(values).save().then((user: any) => user);
export const deleteUserById = (id: string) => UserModel.findOneAndDelete({ _id: id });
export const updateUserById = (id: string, values: Record<string, any>) => UserModel.findByIdAndUpdate(id, values);
