import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";
import type { LeadStatus, PaymentMode } from "@/lib/types";
import { LEAD_SOURCES, PAYMENT_MODES } from "@/lib/constants";

const LEAD_STATUS_VALUES = [
  "NEW",
  "CONTACTED",
  "FOLLOW_UP",
  "MEETING",
  "PROPOSAL",
  "CONVERTED",
  "LOST",
] as const satisfies readonly LeadStatus[];

export type StatusChangeSource = "manual" | "call";

export interface ILeadNote {
  _id?: Types.ObjectId;
  comment: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

export interface ILeadCall {
  _id?: Types.ObjectId;
  calledBy: Types.ObjectId;
  calledAt: Date;
  resultStatus: string;
}

export interface ILeadStatusChange {
  _id?: Types.ObjectId;
  from: LeadStatus;
  to: LeadStatus;
  changedBy: Types.ObjectId;
  changedAt: Date;
  source: StatusChangeSource;
}

export interface ILeadPayment {
  _id?: Types.ObjectId;
  amount: number;
  paidAt: Date;
  mode: PaymentMode;
  reference?: string | null;
  note?: string | null;
  /** Rep credited with the incentive when the payment was recorded. */
  repId?: Types.ObjectId | null;
  recordedBy: Types.ObjectId;
  createdAt: Date;
}

export interface ILead {
  businessName: string;
  phoneNumber: string;
  cityState?: string | null;
  category?: string | null;
  /** Where the lead came from, e.g. "Google My Business" or "Meta Ads". */
  source?: string | null;
  status: LeadStatus;
  assignedTo?: Types.ObjectId | null;
  followUpDate?: Date | null;
  dealValue?: number | null;
  payments: ILeadPayment[];
  notes: ILeadNote[];
  callLogs: ILeadCall[];
  statusHistory: ILeadStatusChange[];
  createdAt: Date;
  updatedAt: Date;
}

export type LeadDocument = HydratedDocument<ILead>;
export type LeadModel = Model<ILead>;

const noteSchema = new Schema<ILeadNote>(
  {
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2_000,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true, versionKey: false },
);

const callSchema = new Schema<ILeadCall>(
  {
    calledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    calledAt: {
      type: Date,
      default: Date.now,
    },
    resultStatus: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
  },
  { _id: true, versionKey: false },
);

const statusChangeSchema = new Schema<ILeadStatusChange>(
  {
    from: {
      type: String,
      enum: LEAD_STATUS_VALUES,
      required: true,
    },
    to: {
      type: String,
      enum: LEAD_STATUS_VALUES,
      required: true,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    source: {
      type: String,
      enum: ["manual", "call"],
      default: "manual",
    },
  },
  { _id: true, versionKey: false },
);

const paymentSchema = new Schema<ILeadPayment>(
  {
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
    mode: {
      type: String,
      enum: PAYMENT_MODES,
      default: "Cash",
    },
    reference: {
      type: String,
      trim: true,
      maxlength: 120,
      default: null,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 1_000,
      default: null,
    },
    repId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true, versionKey: false },
);

const leadSchema = new Schema<ILead>(
  {
    businessName: {
      type: String,
      required: [true, "Business name is required."],
      trim: true,
      maxlength: 200,
      index: true,
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required."],
      trim: true,
      maxlength: 30,
      index: true,
    },
    cityState: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
    category: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
      index: true,
    },
    source: {
      type: String,
      enum: LEAD_SOURCES,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: LEAD_STATUS_VALUES,
      default: "NEW",
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    followUpDate: {
      type: Date,
      default: null,
      index: true,
    },
    dealValue: {
      type: Number,
      min: 0,
      default: null,
    },
    payments: {
      type: [paymentSchema],
      default: [],
    },
    notes: {
      type: [noteSchema],
      default: [],
    },
    callLogs: {
      type: [callSchema],
      default: [],
    },
    statusHistory: {
      type: [statusChangeSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

leadSchema.index({ assignedTo: 1, status: 1 });
leadSchema.index({ followUpDate: 1, status: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ "payments.repId": 1, "payments.paidAt": -1 });
leadSchema.index({
  "statusHistory.changedBy": 1,
  "statusHistory.changedAt": -1,
});

export const Lead =
  (models.Lead as LeadModel | undefined) ??
  model<ILead, LeadModel>("Lead", leadSchema);
