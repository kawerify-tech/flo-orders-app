import * as Notifications from "expo-notifications";

// Function to send a local push notification
export async function sendPushNotification(title: string, body: string) {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    console.warn("Push notification permission not granted!");
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: "default",
    },
    trigger: null, // Instant notification
  });
}
