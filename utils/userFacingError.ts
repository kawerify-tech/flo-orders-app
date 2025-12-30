import { Alert } from 'react-native';

type HandleAppErrorOptions = {
  context: string;
  userMessage?: string;
  title?: string;
};

export const showUserError = (message?: string, title = 'Oops') => {
  Alert.alert(title, message || 'Something went wrong. Please try again.');
};

export const showUserSuccess = (message: string, title = 'Success') => {
  Alert.alert(title, message);
};

export const handleAppError = (error: unknown, options: HandleAppErrorOptions) => {
  console.error(options.context, error);
  showUserError(options.userMessage, options.title);
};
