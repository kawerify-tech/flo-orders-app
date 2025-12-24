import * as Notifications from 'expo-notifications';

export const sendPushNotifications = async (token: string, message: string) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Notification Title",
        body: message,
      },
      trigger: null, // Trigger immediately
    });
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
};
