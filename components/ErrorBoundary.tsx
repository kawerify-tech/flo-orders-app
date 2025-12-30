import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  previousCrash: { message: string; stack?: string; timeIso: string } | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, previousCrash: null };
  }

  async componentDidMount() {
    try {
      const raw = await AsyncStorage.getItem('lastFatalJsError');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.message === 'string' && typeof parsed.timeIso === 'string') {
        this.setState({ previousCrash: parsed });
      }
    } catch {
      // Ignore
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, previousCrash: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    try {
      AsyncStorage.setItem(
        'lastFatalJsError',
        JSON.stringify({
          message: error?.message || 'Unknown error',
          stack: errorInfo?.componentStack || error?.stack || undefined,
          timeIso: new Date().toISOString(),
        })
      ).catch(() => {});
    } catch {
      // Ignore
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, previousCrash: null });
    try {
      AsyncStorage.removeItem('lastFatalJsError').catch(() => {});
    } catch {
      // Ignore
    }
  };

  render() {
    if (!this.state.hasError && this.state.previousCrash) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>App recovered from an error</Text>
          <Text style={styles.message}>{this.state.previousCrash.message}</Text>
          {this.state.previousCrash.stack ? (
            <Text style={styles.stack}>{this.state.previousCrash.stack}</Text>
          ) : null}
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          {this.state.error?.stack ? (
            <Text style={styles.stack}>{this.state.error.stack}</Text>
          ) : null}
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  stack: {
    fontSize: 12,
    color: '#444',
    textAlign: 'left',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#6A0DAD',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
