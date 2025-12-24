import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, Platform, KeyboardAvoidingView, Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
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
  adminId: string;
  adminName: string;
}

const AttendantChat: React.FC<Props> = ({ adminId, adminName }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const currentUser = auth.currentUser;

  if (!currentUser) {
    Alert.alert('Error', 'Attendant must be signed in.');
    return null;
  }

  useEffect(() => {
    const attendantStatusRef = getUserRef(currentUser.uid);
    const connectedRef = ref(database, '.info/connected');

    // Set initial status
    update(attendantStatusRef, {
      status: 'online',
      lastSeen: serverTimestamp(),
      role: 'attendant',
      name: currentUser.displayName || 'Attendant'
    });

    onValue(connectedRef, (snapshot) => {
      if (!snapshot.val()) return;

      onDisconnect(attendantStatusRef).update({
        status: 'offline',
        lastSeen: serverTimestamp()
      });

      update(attendantStatusRef, {
        status: 'online',
        lastSeen: serverTimestamp(),
        role: 'attendant',
        name: currentUser.displayName || 'Attendant'
      });
    });

    return () => {
      update(attendantStatusRef, {
        status: 'offline',
        lastSeen: serverTimestamp()
      });
    };
  }, []);

  useEffect(() => {
    const chatId = [currentUser.uid, adminId].sort().join('_');
    const messagesRef = getMessagesRef(chatId);
    const adminStatusRef = getStatusRef(adminId);

    const statusUnsub = onValue(adminStatusRef, snapshot => {
      const status = snapshot.val();
      setIsOnline(status === 'online');
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
      // Sort messages in ascending order (oldest first)
      const sortedMessages = msgList.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(sortedMessages);

      // Update message status to 'read' for received messages
      sortedMessages.forEach(message => {
        if (message.senderId !== currentUser.uid && message.status !== 'read') {
          const messageRef = ref(database, `chats/${chatId}/messages/${message.id}`);
          update(messageRef, {
            status: 'read'
          });
        }
      });
    });

    return () => {
      statusUnsub();
      messageUnsub();
    };
  }, [adminId]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const chatId = [currentUser.uid, adminId].sort().join('_');
    const messagesRef = getMessagesRef(chatId);
    const chatRef = getChatRef(chatId);

    const messageData = {
      text: input.trim(),
      senderId: currentUser.uid,
      senderName: currentUser.displayName || 'Attendant',
      timestamp: Date.now(),
      status: 'sent',
      type: 'text'
    };

    const chatSnapshot = await get(chatRef);
    if (!chatSnapshot.exists()) {
      await set(chatRef, {
        createdAt: Date.now(),
        lastMessage: messageData.text,
        lastMessageTime: Date.now(),
        participants: {
          [currentUser.uid]: true,
          [adminId]: true
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
      update(newMessageRef, {
        status: 'delivered'
      });
    }, 1000);

    setInput('');
    
    // Scroll to the last message after a short delay to ensure the message is rendered
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
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
    const isFromAttendant = item.senderName === 'Attendant';

    return (
      <View style={[
        styles.messageContainer,
        isFromAttendant ? styles.sentContainer : styles.receivedContainer
      ]}>
        <View style={[
          styles.bubble,
          isFromAttendant ? styles.sentBubble : styles.receivedBubble
        ]}>
          <Text style={styles.sender}>{item.senderName}</Text>
          <Text style={styles.text}>{item.text}</Text>
          <View style={styles.messageFooter}>
            <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
            {isFromAttendant && (
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
          <Text style={styles.headerName}>{adminName}</Text>
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

export default AttendantChat;
