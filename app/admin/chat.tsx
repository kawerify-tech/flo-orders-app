import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, Platform, KeyboardAvoidingView, Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  auth, database, getChatRef, getMessagesRef,
  getStatusRef, getUserRef, ref, onValue, push,
  set, serverTimestamp, update, onDisconnect, get
} from '../../lib/firebaseConfig';
import { format, isSameDay } from 'date-fns';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  type: 'text';
}

interface Props {
  attendantId: string;
  attendantName: string;
}

const chatCacheKey = (chatId: string) => `chat_cache:${chatId}`;

const safeParseMessages = (raw: string | null): Message[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(Boolean)
      .map((m: any) => ({
        id: String(m?.id || ''),
        text: String(m?.text || ''),
        senderId: String(m?.senderId || ''),
        senderName: String(m?.senderName || ''),
        timestamp: Number(m?.timestamp || 0),
        status: (m?.status as Message['status']) || 'sent',
        type: (m?.type as Message['type']) || 'text',
      }))
      .filter(m => m.id && m.senderId);
  } catch {
    return [];
  }
};

const persistMessages = async (chatId: string, next: Message[]) => {
  try {
    const trimmed = next.slice(-500);
    await AsyncStorage.setItem(chatCacheKey(chatId), JSON.stringify(trimmed));
  } catch {
    // ignore
  }
};

const AdminChat: React.FC<Props> = ({ attendantId, attendantName }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) {
      Alert.alert('Error', 'Please sign in to access chat.');
      return;
    }

    const adminStatusRef = getUserRef(currentUser.uid);
    const connectedRef = ref(database, '.info/connected');

    const updateStatus = async () => {
      try {
        await update(adminStatusRef, {
          status: 'online',
          lastSeen: serverTimestamp(),
          role: 'admin',
          name: currentUser.displayName || 'Admin'
        });
      } catch (error) {
        console.error('Error updating status:', error);
      }
    };

    updateStatus();

    const connectedListener = onValue(connectedRef, async (snapshot) => {
      if (!snapshot.val()) return;

      try {
        await onDisconnect(adminStatusRef).update({
          status: 'offline',
          lastSeen: serverTimestamp()
        });

        await update(adminStatusRef, {
          status: 'online',
          lastSeen: serverTimestamp(),
          role: 'admin',
          name: currentUser.displayName || 'Admin'
        });
      } catch (error) {
        console.error('Error handling connection status:', error);
      }
    });

    return () => {
      connectedListener();
      if (auth.currentUser?.uid === currentUser.uid) {
        update(adminStatusRef, {
          status: 'offline',
          lastSeen: serverTimestamp()
        }).catch(console.error);
      }
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const chatId = [currentUser.uid, attendantId].sort().join('_');
    const messagesRef = getMessagesRef(chatId);
    const attendantStatusRef = getStatusRef(attendantId);

    let isMounted = true;

    (async () => {
      try {
        const cached = await AsyncStorage.getItem(chatCacheKey(chatId));
        const parsed = safeParseMessages(cached);
        if (isMounted && parsed.length) {
          setMessages(parsed.sort((a, b) => a.timestamp - b.timestamp));
        }
      } catch {
        // ignore
      }
    })();

    const statusUnsub = onValue(attendantStatusRef, snapshot => {
      const status = snapshot.val();
      setIsOnline(status?.status === 'online');
    });

    const messageUnsub = onValue(messagesRef, snapshot => {
      const msgList: Message[] = [];
      snapshot.forEach(child => {
        const msg = child.val();
        msgList.push({
          id: child.key || '',
          text: msg.text || '',
          senderId: msg.senderId,
          senderName: msg.senderName,
          timestamp: msg.timestamp || 0,
          status: msg.status || 'sent',
          type: msg.type || 'text'
        });
      });
      const sortedMessages = msgList.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(sortedMessages);
      persistMessages(chatId, sortedMessages);

      // Mark received messages as read
      sortedMessages.forEach(message => {
        if (message.senderId !== currentUser.uid && message.status !== 'read') {
          const messageRef = ref(database, `chats/${chatId}/messages/${message.id}`);
          update(messageRef, { status: 'read' });
        }
      });
    });

    return () => {
      isMounted = false;
      statusUnsub();
      messageUnsub();
    };
  }, [attendantId, currentUser]);

  const handleSend = async () => {
    if (!input.trim() || !currentUser) return;

    try {
      const chatId = [currentUser.uid, attendantId].sort().join('_');
      const messagesRef = getMessagesRef(chatId);
      const chatRef = getChatRef(chatId);

      const messageData = {
        text: input.trim(),
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'Admin',
        timestamp: Date.now(),
        status: 'sent',
        type: 'text'
      };

      setMessages(prev => {
        const next = [...prev, { id: `local_${Date.now()}`, ...(messageData as any) } as Message].sort(
          (a, b) => a.timestamp - b.timestamp
        );
        persistMessages(chatId, next);
        return next;
      });

      const chatSnapshot = await get(chatRef);
      if (!chatSnapshot.exists()) {
        await set(chatRef, {
          createdAt: Date.now(),
          lastMessage: messageData.text,
          lastMessageTime: Date.now(),
          participants: {
            [currentUser.uid]: true,
            [attendantId]: true
          }
        });
      }

      const newMessageRef = push(messagesRef);
      await set(newMessageRef, messageData);
      await update(chatRef, {
        lastMessage: messageData.text,
        lastMessageTime: Date.now()
      });

      setTimeout(() => {
        update(newMessageRef, { status: 'delivered' }).catch(console.error);
      }, 1000);

      setInput('');
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const filteredMessages = messages.filter(msg => 
    msg.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedMessages = filteredMessages.reduce((groups, message) => {
    const date = format(new Date(message.timestamp), 'MMMM d, yyyy');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  const renderDateHeader = (date: string) => (
    <View style={styles.dateHeader}>
      <View style={styles.dateHeaderContent}>
        <Text style={styles.dateHeaderText}>{date}</Text>
      </View>
    </View>
  );

  const renderMessage = ({ item }: { item: Message }) => {
    const isFromAdmin = item.senderName === 'Admin';

    return (
      <View style={[
        styles.messageContainer,
        isFromAdmin ? styles.sentContainer : styles.receivedContainer
      ]}>
        <View style={[
          styles.bubble,
          isFromAdmin ? styles.sentBubble : styles.receivedBubble
        ]}>
          <Text style={styles.sender}>{item.senderName}</Text>
          <Text style={styles.text}>{item.text}</Text>
          <View style={styles.messageFooter}>
            <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
            {isFromAdmin && (
              <View style={styles.statusContainer}>
                {item.status === 'read' ? (
                  <Icon name="checkmark-done" size={16} color="#4CAF50" />
                ) : item.status === 'delivered' ? (
                  <Icon name="checkmark-done" size={16} color="#757575" />
                ) : (
                  <Icon name="checkmark" size={16} color="#757575" />
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderSection = ({ item }: { item: { title: string; data: Message[] } }) => (
    <View>
      {renderDateHeader(item.title)}
      {item.data.map((message) => (
        <View key={message.id}>
          {renderMessage({ item: message })}
        </View>
      ))}
    </View>
  );

  const sections = Object.entries(groupedMessages).map(([date, messages]) => ({
    title: date,
    data: messages
  }));

  const formatTime = (timestamp: number) =>
    timestamp ? format(new Date(timestamp), 'h:mm a') : '';

  const formatDate = (timestamp: number) =>
    timestamp ? format(new Date(timestamp), 'MMMM d, yyyy') : '';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.headerName}>{attendantName}</Text>
          <Text style={styles.headerStatus}>{isOnline ? 'Online' : 'Offline'}</Text>
        </View>
        <TouchableOpacity onPress={() => setIsSearching(!isSearching)}>
          <Icon name="search" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {isSearching && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#666"
          />
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={sections}
        keyExtractor={(item) => item.title}
        renderItem={renderSection}
        contentContainerStyle={styles.messageList}
        inverted={false}
        onContentSizeChange={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          placeholder="Type a message"
          placeholderTextColor="#666"
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          multiline
        />
        <TouchableOpacity 
          onPress={handleSend} 
          disabled={!input.trim()}
          style={[
            styles.sendButton,
            !input.trim() && { backgroundColor: '#BDBDBD' }
          ]}
        >
          <Icon name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5DDD5',
  },
  header: {
    backgroundColor: '#6A0DAD',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
  },
  headerName: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  headerStatus: {
    fontSize: 14,
    color: '#D1D1D1',
  },
  messageList: {
    padding: 8,
    flexGrow: 1,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateText: {
    fontSize: 12,
    color: '#888',
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 8,
  },
  sentContainer: {
    justifyContent: 'flex-end',
  },
  receivedContainer: {
    justifyContent: 'flex-start',
  },
  bubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '80%',
    elevation: 1,
  },
  sentBubble: {
    backgroundColor: '#DCF8C6',
    borderTopRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: 'white',
    borderTopLeftRadius: 4,
  },
  sender: {
    fontSize: 12,
    color: '#075E54',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  text: {
    fontSize: 16,
    color: '#000',
  },
  time: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#F0F0F0',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    marginRight: 8,
    elevation: 2,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#075E54',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  statusContainer: {
    marginLeft: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#F0F0F0',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    marginRight: 8,
    elevation: 2,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateHeaderContent: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dateHeaderText: {
    fontSize: 12,
    color: '#888',
  },
});

export default AdminChat;
