import bcrypt from "bcryptjs";
import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
} from "mongoose";
import type { UserRole } from "@/lib/types";
import { DEFAULT_INCENTIVE_RATE } from "@/lib/constants";

export interface IUser {
  name: string;
  username: string;
  email: string | null;
  password: string;
  role: UserRole;
  isActive: boolean;
  incentiveRate: number;
  incentiveEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export type UserDocument = HydratedDocument<IUser, IUserMethods>;
export type UserModel = Model<IUser, Record<string, never>, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      maxlength: 120,
    },
    username: {
      type: String,
      required: [true, "Username is required."],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters."],
      maxlength: [32, "Username must be 32 characters or fewer."],
      match: [
        /^[a-z0-9._-]+$/,
        "Use only letters, numbers, dots, dashes, or underscores.",
      ],
    },
    email: {
      // Optional: accounts are created with a username, but older accounts
      // may still sign in with their email address.
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true,
    },
    password: {
      type: String,
      required: [true, "Password is required."],
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ["SUPER_ADMIN", "ADMIN", "SALES_EXEC"],
      default: "SALES_EXEC",
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    incentiveRate: {
      type: Number,
      min: 0,
      max: 100,
      default: DEFAULT_INCENTIVE_RATE,
    },
    /**
     * Some reps are on a fixed salary. The super admin decides whether a rep
     * earns incentives at all; when disabled the rate is ignored.
     */
    incentiveEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function comparePassword(
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.set("toJSON", {
  transform: (_document, returned) => {
    const value = returned as unknown as Record<string, unknown>;
    delete value.password;
    return value;
  },
});

export const User =
  (models.User as UserModel | undefined) ??
  model<IUser, UserModel>("User", userSchema);
