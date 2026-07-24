import { createContext, useContext } from "react";

export type NotificationStatus = "unread" | "read" | "archived";

export interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  body: string;
  status: NotificationStatus;
  priority: "low" | "normal" | "high";
  deepLink?: string;
  createdAt: number;
  readAt?: number;
}

export interface NotificationDataValue {
  enabled: boolean;
  loading: boolean;
  notifications: NotificationRecord[];
  unreadCount: number;
  markRead(notificationId: string): Promise<void>;
  markUnread(notificationId: string): Promise<void>;
  markAllRead(): Promise<void>;
}

const noopAsync = async () => undefined;

export const emptyNotificationData: NotificationDataValue = {
  enabled: false,
  loading: false,
  notifications: [],
  unreadCount: 0,
  markRead: noopAsync,
  markUnread: noopAsync,
  markAllRead: noopAsync,
};

export const NotificationDataContext = createContext<NotificationDataValue>(emptyNotificationData);

export function useNotificationData() {
  return useContext(NotificationDataContext);
}
