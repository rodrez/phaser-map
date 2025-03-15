import { MedievalPanel } from '../medieval-panel';
import { chatService } from '../../utils/ChatService';
import { logger, LogCategory } from '../../utils/Logger';
import { DOMUIHelper } from '../../utils/DOMUIHelper';

/**
 * UI component for chat and communication
 */
export class ChatUI {
    /**
     * Create a new chat UI
     * @param {Phaser.Scene} scene - The scene this UI belongs to
     * @param {Object} options - Configuration options
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        this.isVisible = false;
        this.messages = [];
        this.currentRoom = null;
        this.rooms = [];
        
        // Default options
        this.options = {
            width: options.width || 600,
            height: options.height || 500,
            title: options.title || 'Chat',
            position: options.position || { x: 'right', y: 'center' },
            onClose: options.onClose || null,
            autoConnect: options.autoConnect !== undefined ? options.autoConnect : true,
            serverUrl: options.serverUrl || 'http://localhost:3000',
            defaultRoom: options.defaultRoom || 'lobby'
        };
        
        // Make UI responsive based on screen size
        this.adjustSizeBasedOnScreen();
        
        // Initialize UI components
        this.initializeComponents();
        
        // Connect to chat server if autoConnect is true
        if (this.options.autoConnect) {
            this.connectToServer();
        }
    }
    
    /**
     * Initialize UI components
     */
    initializeComponents() {
        // Create the panel
        this.panel = new MedievalPanel(this.scene, {
            title: this.options.title,
            width: this.options.width,
            height: this.options.height,
            position: this.options.position,
            onClose: () => {
                if (this.options.onClose) {
                    this.options.onClose();
                }
            }
        });
        
        // Create UI helper
        this.uiHelper = new DOMUIHelper(this.scene);
        
        // Create the chat container
        this.createChatContainer();
        
        // Create the room selector
        this.createRoomSelector();
        
        // Create the message list
        this.createMessageList();
        
        // Create the input area
        this.createInputArea();
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    /**
     * Create the chat container
     */
    createChatContainer() {
        this.chatContainer = this.uiHelper.createContainer('chat-container');
        this.chatContainer.style.display = 'flex';
        this.chatContainer.style.flexDirection = 'column';
        this.chatContainer.style.height = '100%';
        this.chatContainer.style.padding = '10px';
        this.chatContainer.style.boxSizing = 'border-box';
        
        this.panel.addDOMElement(this.chatContainer);
    }
    
    /**
     * Create the room selector
     */
    createRoomSelector() {
        // Create room selector container
        this.roomSelectorContainer = this.uiHelper.createContainer('room-selector-container');
        this.roomSelectorContainer.style.display = 'flex';
        this.roomSelectorContainer.style.marginBottom = '10px';
        this.roomSelectorContainer.style.padding = '5px';
        this.roomSelectorContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
        this.roomSelectorContainer.style.borderRadius = '4px';
        
        // Create room label
        const roomLabel = document.createElement('div');
        roomLabel.textContent = 'Room:';
        roomLabel.style.marginRight = '10px';
        roomLabel.style.color = '#c8a165';
        roomLabel.style.fontWeight = 'bold';
        roomLabel.style.alignSelf = 'center';
        
        // Create room selector
        this.roomSelector = document.createElement('select');
        this.roomSelector.className = 'medieval-select';
        this.roomSelector.style.flex = '1';
        this.roomSelector.style.padding = '5px';
        this.roomSelector.style.backgroundColor = '#2a1a0a';
        this.roomSelector.style.color = '#c8a165';
        this.roomSelector.style.border = '1px solid #8b5a2b';
        this.roomSelector.style.borderRadius = '4px';
        this.roomSelector.style.outline = 'none';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select a room...';
        this.roomSelector.appendChild(defaultOption);
        
        // Create refresh button
        this.refreshButton = document.createElement('button');
        this.refreshButton.className = 'medieval-button';
        this.refreshButton.innerHTML = '🔄';
        this.refreshButton.title = 'Refresh room list';
        this.refreshButton.style.marginLeft = '5px';
        this.refreshButton.style.padding = '5px 10px';
        this.refreshButton.style.backgroundColor = '#2a1a0a';
        this.refreshButton.style.color = '#c8a165';
        this.refreshButton.style.border = '1px solid #8b5a2b';
        this.refreshButton.style.borderRadius = '4px';
        this.refreshButton.style.cursor = 'pointer';
        
        // Create new room button
        this.newRoomButton = document.createElement('button');
        this.newRoomButton.className = 'medieval-button';
        this.newRoomButton.innerHTML = '+';
        this.newRoomButton.title = 'Create new room';
        this.newRoomButton.style.marginLeft = '5px';
        this.newRoomButton.style.padding = '5px 10px';
        this.newRoomButton.style.backgroundColor = '#2a1a0a';
        this.newRoomButton.style.color = '#c8a165';
        this.newRoomButton.style.border = '1px solid #8b5a2b';
        this.newRoomButton.style.borderRadius = '4px';
        this.newRoomButton.style.cursor = 'pointer';
        
        // Add elements to container
        this.roomSelectorContainer.appendChild(roomLabel);
        this.roomSelectorContainer.appendChild(this.roomSelector);
        this.roomSelectorContainer.appendChild(this.refreshButton);
        this.roomSelectorContainer.appendChild(this.newRoomButton);
        
        // Add to chat container
        this.chatContainer.appendChild(this.roomSelectorContainer);
    }
    
    /**
     * Create the message list
     */
    createMessageList() {
        // Create message list container
        this.messageListContainer = this.uiHelper.createContainer('message-list-container');
        this.messageListContainer.style.flex = '1';
        this.messageListContainer.style.overflowY = 'auto';
        this.messageListContainer.style.marginBottom = '10px';
        this.messageListContainer.style.padding = '10px';
        this.messageListContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
        this.messageListContainer.style.borderRadius = '4px';
        this.messageListContainer.style.border = '1px solid #8b5a2b';
        
        // Add to chat container
        this.chatContainer.appendChild(this.messageListContainer);
    }
    
    /**
     * Create the input area
     */
    createInputArea() {
        // Create input container
        this.inputContainer = this.uiHelper.createContainer('input-container');
        this.inputContainer.style.display = 'flex';
        this.inputContainer.style.marginTop = '5px';
        
        // Create message input
        this.messageInput = document.createElement('input');
        this.messageInput.type = 'text';
        this.messageInput.placeholder = 'Type your message...';
        this.messageInput.style.flex = '1';
        this.messageInput.style.padding = '8px';
        this.messageInput.style.backgroundColor = '#2a1a0a';
        this.messageInput.style.color = '#c8a165';
        this.messageInput.style.border = '1px solid #8b5a2b';
        this.messageInput.style.borderRadius = '4px';
        this.messageInput.style.outline = 'none';
        
        // Create send button
        this.sendButton = document.createElement('button');
        this.sendButton.className = 'medieval-button';
        this.sendButton.textContent = 'Send';
        this.sendButton.style.marginLeft = '10px';
        this.sendButton.style.padding = '8px 15px';
        this.sendButton.style.backgroundColor = '#2a1a0a';
        this.sendButton.style.color = '#c8a165';
        this.sendButton.style.border = '1px solid #8b5a2b';
        this.sendButton.style.borderRadius = '4px';
        this.sendButton.style.cursor = 'pointer';
        
        // Add elements to container
        this.inputContainer.appendChild(this.messageInput);
        this.inputContainer.appendChild(this.sendButton);
        
        // Add to chat container
        this.chatContainer.appendChild(this.inputContainer);
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Room selector change
        this.roomSelector.addEventListener('change', () => {
            const roomId = this.roomSelector.value;
            if (roomId) {
                this.joinRoom(roomId);
            }
        });
        
        // Refresh button click
        this.refreshButton.addEventListener('click', () => {
            this.refreshRooms();
        });
        
        // New room button click
        this.newRoomButton.addEventListener('click', () => {
            this.showCreateRoomDialog();
        });
        
        // Send button click
        this.sendButton.addEventListener('click', () => {
            this.sendMessage();
        });
        
        // Message input keypress
        this.messageInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // Chat service events
        chatService.onConnection(() => {
            this.refreshRooms();
            // Clear any error messages
            this.clearConnectionError();
        });
        
        chatService.onMessage((message) => {
            this.addMessage(message);
        });
        
        chatService.onRoomHistory((messages) => {
            this.clearMessages();
            messages.forEach(message => {
                this.addMessage(message);
            });
        });
        
        chatService.onRoomListUpdated((rooms) => {
            this.updateRoomList(rooms);
        });
        
        chatService.onDisconnection((reason) => {
            // Show connection error message
            this.showConnectionError(reason);
        });
    }
    
    /**
     * Connect to the chat server
     */
    connectToServer() {
        chatService.connect(this.options.serverUrl);
    }
    
    /**
     * Refresh the room list
     */
    async refreshRooms() {
        const rooms = await chatService.getAvailableRooms();
        this.updateRoomList(rooms);
    }
    
    /**
     * Update the room list in the UI
     * @param {Array} rooms - The list of rooms
     */
    updateRoomList(rooms) {
        this.rooms = rooms;
        
        // Clear existing options except the default one
        while (this.roomSelector.options.length > 1) {
            this.roomSelector.remove(1);
        }
        
        // Add rooms to selector
        rooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room.id;
            option.textContent = room.name + (room.isPrivate ? ' 🔒' : '');
            this.roomSelector.appendChild(option);
        });
        
        // If we have a current room, select it
        if (this.currentRoom) {
            this.roomSelector.value = this.currentRoom;
        } else if (this.options.defaultRoom) {
            // Try to select the default room
            const defaultRoomExists = rooms.some(room => room.id === this.options.defaultRoom);
            if (defaultRoomExists) {
                this.roomSelector.value = this.options.defaultRoom;
                this.joinRoom(this.options.defaultRoom);
            }
        }
    }
    
    /**
     * Show dialog to create a new room
     */
    showCreateRoomDialog() {
        // Create dialog container
        const dialogContainer = this.uiHelper.createContainer('create-room-dialog');
        dialogContainer.style.position = 'absolute';
        dialogContainer.style.top = '50%';
        dialogContainer.style.left = '50%';
        dialogContainer.style.transform = 'translate(-50%, -50%)';
        dialogContainer.style.width = '300px';
        dialogContainer.style.padding = '20px';
        dialogContainer.style.backgroundColor = '#2a1a0a';
        dialogContainer.style.border = '2px solid #8b5a2b';
        dialogContainer.style.borderRadius = '8px';
        dialogContainer.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.5)';
        dialogContainer.style.zIndex = '1000';
        
        // Create title
        const title = document.createElement('h3');
        title.textContent = 'Create New Room';
        title.style.margin = '0 0 15px 0';
        title.style.color = '#c8a165';
        title.style.textAlign = 'center';
        
        // Create room ID input
        const roomIdLabel = document.createElement('label');
        roomIdLabel.textContent = 'Room ID:';
        roomIdLabel.style.display = 'block';
        roomIdLabel.style.marginBottom = '5px';
        roomIdLabel.style.color = '#c8a165';
        
        const roomIdInput = document.createElement('input');
        roomIdInput.type = 'text';
        roomIdInput.placeholder = 'Enter room ID';
        roomIdInput.style.width = '100%';
        roomIdInput.style.padding = '8px';
        roomIdInput.style.marginBottom = '15px';
        roomIdInput.style.backgroundColor = '#1a0d05';
        roomIdInput.style.color = '#c8a165';
        roomIdInput.style.border = '1px solid #8b5a2b';
        roomIdInput.style.borderRadius = '4px';
        roomIdInput.style.outline = 'none';
        roomIdInput.style.boxSizing = 'border-box';
        
        // Create room name input
        const roomNameLabel = document.createElement('label');
        roomNameLabel.textContent = 'Room Name:';
        roomNameLabel.style.display = 'block';
        roomNameLabel.style.marginBottom = '5px';
        roomNameLabel.style.color = '#c8a165';
        
        const roomNameInput = document.createElement('input');
        roomNameInput.type = 'text';
        roomNameInput.placeholder = 'Enter room name';
        roomNameInput.style.width = '100%';
        roomNameInput.style.padding = '8px';
        roomNameInput.style.marginBottom = '15px';
        roomNameInput.style.backgroundColor = '#1a0d05';
        roomNameInput.style.color = '#c8a165';
        roomNameInput.style.border = '1px solid #8b5a2b';
        roomNameInput.style.borderRadius = '4px';
        roomNameInput.style.outline = 'none';
        roomNameInput.style.boxSizing = 'border-box';
        
        // Create private room checkbox
        const privateRoomContainer = document.createElement('div');
        privateRoomContainer.style.display = 'flex';
        privateRoomContainer.style.alignItems = 'center';
        privateRoomContainer.style.marginBottom = '15px';
        
        const privateRoomCheckbox = document.createElement('input');
        privateRoomCheckbox.type = 'checkbox';
        privateRoomCheckbox.id = 'private-room-checkbox';
        privateRoomCheckbox.style.marginRight = '10px';
        
        const privateRoomLabel = document.createElement('label');
        privateRoomLabel.htmlFor = 'private-room-checkbox';
        privateRoomLabel.textContent = 'Private Room';
        privateRoomLabel.style.color = '#c8a165';
        
        privateRoomContainer.appendChild(privateRoomCheckbox);
        privateRoomContainer.appendChild(privateRoomLabel);
        
        // Create password input (initially hidden)
        const passwordContainer = document.createElement('div');
        passwordContainer.style.display = 'none';
        passwordContainer.style.marginBottom = '15px';
        
        const passwordLabel = document.createElement('label');
        passwordLabel.textContent = 'Password:';
        passwordLabel.style.display = 'block';
        passwordLabel.style.marginBottom = '5px';
        passwordLabel.style.color = '#c8a165';
        
        const passwordInput = document.createElement('input');
        passwordInput.type = 'password';
        passwordInput.placeholder = 'Enter room password';
        passwordInput.style.width = '100%';
        passwordInput.style.padding = '8px';
        passwordInput.style.backgroundColor = '#1a0d05';
        passwordInput.style.color = '#c8a165';
        passwordInput.style.border = '1px solid #8b5a2b';
        passwordInput.style.borderRadius = '4px';
        passwordInput.style.outline = 'none';
        passwordInput.style.boxSizing = 'border-box';
        
        passwordContainer.appendChild(passwordLabel);
        passwordContainer.appendChild(passwordInput);
        
        // Show/hide password input based on checkbox
        privateRoomCheckbox.addEventListener('change', () => {
            passwordContainer.style.display = privateRoomCheckbox.checked ? 'block' : 'none';
        });
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'space-between';
        
        // Create cancel button
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.padding = '8px 15px';
        cancelButton.style.backgroundColor = '#3a2a1a';
        cancelButton.style.color = '#c8a165';
        cancelButton.style.border = '1px solid #8b5a2b';
        cancelButton.style.borderRadius = '4px';
        cancelButton.style.cursor = 'pointer';
        
        // Create create button
        const createButton = document.createElement('button');
        createButton.textContent = 'Create';
        createButton.style.padding = '8px 15px';
        createButton.style.backgroundColor = '#3a2a1a';
        createButton.style.color = '#c8a165';
        createButton.style.border = '1px solid #8b5a2b';
        createButton.style.borderRadius = '4px';
        createButton.style.cursor = 'pointer';
        
        // Add event listeners
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(dialogContainer);
        });
        
        createButton.addEventListener('click', async () => {
            const roomId = roomIdInput.value.trim();
            const roomName = roomNameInput.value.trim();
            const isPrivate = privateRoomCheckbox.checked;
            const password = passwordInput.value.trim();
            
            if (!roomId) {
                alert('Please enter a room ID');
                return;
            }
            
            if (isPrivate && !password) {
                alert('Private rooms must have a password');
                return;
            }
            
            try {
                await chatService.createRoom(roomId, roomName || roomId, isPrivate, isPrivate ? password : null);
                document.body.removeChild(dialogContainer);
                this.refreshRooms();
                this.joinRoom(roomId, isPrivate ? password : null);
            } catch (error) {
                alert('Error creating room: ' + error.message);
            }
        });
        
        // Add elements to button container
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(createButton);
        
        // Add elements to dialog container
        dialogContainer.appendChild(title);
        dialogContainer.appendChild(roomIdLabel);
        dialogContainer.appendChild(roomIdInput);
        dialogContainer.appendChild(roomNameLabel);
        dialogContainer.appendChild(roomNameInput);
        dialogContainer.appendChild(privateRoomContainer);
        dialogContainer.appendChild(passwordContainer);
        dialogContainer.appendChild(buttonContainer);
        
        // Add dialog to body
        document.body.appendChild(dialogContainer);
        
        // Focus on room ID input
        roomIdInput.focus();
    }
    
    /**
     * Join a room
     * @param {string} roomId - The room ID to join
     * @param {string} password - The password for private rooms
     */
    joinRoom(roomId, password = null) {
        if (!roomId) return;
        
        // Check if room is private and we don't have a password
        const room = this.rooms.find(r => r.id === roomId);
        if (room && room.isPrivate && !password) {
            this.showPasswordDialog(roomId);
            return;
        }
        
        // Join the room
        chatService.joinRoom(roomId, password);
        this.currentRoom = roomId;
        this.roomSelector.value = roomId;
        
        // Update UI
        this.updateRoomInfo();
    }
    
    /**
     * Show dialog to enter password for a private room
     * @param {string} roomId - The room ID
     */
    showPasswordDialog(roomId) {
        // Get room info
        const room = this.rooms.find(r => r.id === roomId);
        if (!room) return;
        
        // Create dialog container
        const dialogContainer = this.uiHelper.createContainer('password-dialog');
        dialogContainer.style.position = 'absolute';
        dialogContainer.style.top = '50%';
        dialogContainer.style.left = '50%';
        dialogContainer.style.transform = 'translate(-50%, -50%)';
        dialogContainer.style.width = '300px';
        dialogContainer.style.padding = '20px';
        dialogContainer.style.backgroundColor = '#2a1a0a';
        dialogContainer.style.border = '2px solid #8b5a2b';
        dialogContainer.style.borderRadius = '8px';
        dialogContainer.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.5)';
        dialogContainer.style.zIndex = '1000';
        
        // Create title
        const title = document.createElement('h3');
        title.textContent = `Join Private Room: ${room.name}`;
        title.style.margin = '0 0 15px 0';
        title.style.color = '#c8a165';
        title.style.textAlign = 'center';
        
        // Create password input
        const passwordLabel = document.createElement('label');
        passwordLabel.textContent = 'Password:';
        passwordLabel.style.display = 'block';
        passwordLabel.style.marginBottom = '5px';
        passwordLabel.style.color = '#c8a165';
        
        const passwordInput = document.createElement('input');
        passwordInput.type = 'password';
        passwordInput.placeholder = 'Enter room password';
        passwordInput.style.width = '100%';
        passwordInput.style.padding = '8px';
        passwordInput.style.marginBottom = '20px';
        passwordInput.style.backgroundColor = '#1a0d05';
        passwordInput.style.color = '#c8a165';
        passwordInput.style.border = '1px solid #8b5a2b';
        passwordInput.style.borderRadius = '4px';
        passwordInput.style.outline = 'none';
        passwordInput.style.boxSizing = 'border-box';
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'space-between';
        
        // Create cancel button
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.padding = '8px 15px';
        cancelButton.style.backgroundColor = '#3a2a1a';
        cancelButton.style.color = '#c8a165';
        cancelButton.style.border = '1px solid #8b5a2b';
        cancelButton.style.borderRadius = '4px';
        cancelButton.style.cursor = 'pointer';
        
        // Create join button
        const joinButton = document.createElement('button');
        joinButton.textContent = 'Join';
        joinButton.style.padding = '8px 15px';
        joinButton.style.backgroundColor = '#3a2a1a';
        joinButton.style.color = '#c8a165';
        joinButton.style.border = '1px solid #8b5a2b';
        joinButton.style.borderRadius = '4px';
        joinButton.style.cursor = 'pointer';
        
        // Add event listeners
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(dialogContainer);
        });
        
        joinButton.addEventListener('click', () => {
            const password = passwordInput.value.trim();
            
            if (!password) {
                alert('Please enter a password');
                return;
            }
            
            document.body.removeChild(dialogContainer);
            this.joinRoom(roomId, password);
        });
        
        // Add elements to button container
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(joinButton);
        
        // Add elements to dialog container
        dialogContainer.appendChild(title);
        dialogContainer.appendChild(passwordLabel);
        dialogContainer.appendChild(passwordInput);
        dialogContainer.appendChild(buttonContainer);
        
        // Add dialog to body
        document.body.appendChild(dialogContainer);
        
        // Focus on password input
        passwordInput.focus();
    }
    
    /**
     * Send a message
     */
    sendMessage() {
        const message = this.messageInput.value.trim();
        
        if (!message || !this.currentRoom) {
            return;
        }
        
        chatService.sendMessage(message);
        this.messageInput.value = '';
        this.messageInput.focus();
    }
    
    /**
     * Add a message to the message list
     * @param {Object} message - The message to add
     */
    addMessage(message) {
        // Create message container
        const messageContainer = document.createElement('div');
        messageContainer.className = 'chat-message';
        messageContainer.style.marginBottom = '10px';
        messageContainer.style.padding = '8px';
        messageContainer.style.backgroundColor = 'rgba(42, 26, 10, 0.5)';
        messageContainer.style.borderRadius = '4px';
        messageContainer.style.borderLeft = '3px solid #8b5a2b';
        
        // Create message header
        const messageHeader = document.createElement('div');
        messageHeader.className = 'chat-message-header';
        messageHeader.style.marginBottom = '5px';
        messageHeader.style.display = 'flex';
        messageHeader.style.justifyContent = 'space-between';
        
        // Create sender name
        const senderName = document.createElement('span');
        senderName.className = 'chat-message-sender';
        senderName.textContent = message.sender;
        senderName.style.fontWeight = 'bold';
        senderName.style.color = '#c8a165';
        
        // Create timestamp
        const timestamp = document.createElement('span');
        timestamp.className = 'chat-message-timestamp';
        timestamp.textContent = this.formatTimestamp(message.timestamp);
        timestamp.style.fontSize = '0.8em';
        timestamp.style.color = '#8b5a2b';
        
        // Create message content
        const messageContent = document.createElement('div');
        messageContent.className = 'chat-message-content';
        messageContent.textContent = message.message;
        messageContent.style.wordBreak = 'break-word';
        
        // Add elements to message header
        messageHeader.appendChild(senderName);
        messageHeader.appendChild(timestamp);
        
        // Add elements to message container
        messageContainer.appendChild(messageHeader);
        messageContainer.appendChild(messageContent);
        
        // Add to message list
        this.messageListContainer.appendChild(messageContainer);
        
        // Scroll to bottom
        this.messageListContainer.scrollTop = this.messageListContainer.scrollHeight;
        
        // Add to messages array
        this.messages.push(message);
    }
    
    /**
     * Clear all messages
     */
    clearMessages() {
        this.messageListContainer.innerHTML = '';
        this.messages = [];
    }
    
    /**
     * Format a timestamp
     * @param {string} timestamp - The timestamp to format
     * @returns {string} - The formatted timestamp
     */
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    /**
     * Adjust size based on screen size
     */
    adjustSizeBasedOnScreen() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        // Adjust width based on screen size
        if (screenWidth < 768) {
            this.options.width = Math.min(screenWidth * 0.9, this.options.width);
        }
        
        // Adjust height based on screen size
        if (screenHeight < 768) {
            this.options.height = Math.min(screenHeight * 0.8, this.options.height);
        }
        
        // Add resize listener
        window.addEventListener('resize', () => this.handleResize());
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        // Adjust width based on screen size
        if (screenWidth < 768) {
            this.panel.container.style.width = `${Math.min(screenWidth * 0.9, this.options.width)}px`;
        } else {
            this.panel.container.style.width = `${this.options.width}px`;
        }
        
        // Adjust height based on screen size
        if (screenHeight < 768) {
            this.panel.container.style.maxHeight = `${Math.min(screenHeight * 0.8, this.options.height)}px`;
        } else {
            this.panel.container.style.maxHeight = `${this.options.height}px`;
        }
    }
    
    /**
     * Show the chat UI
     */
    show() {
        if (!this.isVisible) {
            this.panel.show();
            this.isVisible = true;
            
            // Connect to server if not already connected
            if (!chatService.connected) {
                this.connectToServer();
            }
            
            // Refresh rooms
            this.refreshRooms();
            
            // Focus on message input
            setTimeout(() => {
                this.messageInput.focus();
            }, 100);
        }
    }
    
    /**
     * Hide the chat UI
     */
    hide() {
        if (this.isVisible) {
            this.panel.hide();
            this.isVisible = false;
        }
    }
    
    /**
     * Toggle the chat UI
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * Destroy the chat UI
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);
        
        // Destroy panel
        this.panel.destroy();
        
        // Disconnect from server
        chatService.disconnect();
    }
    
    /**
     * Show connection error message
     * @param {string} message - The error message
     */
    showConnectionError(message) {
        // Create error message container if it doesn't exist
        if (!this.errorContainer) {
            this.errorContainer = this.uiHelper.createContainer('error-container');
            this.errorContainer.style.backgroundColor = 'rgba(220, 53, 69, 0.8)';
            this.errorContainer.style.color = 'white';
            this.errorContainer.style.padding = '10px';
            this.errorContainer.style.marginBottom = '10px';
            this.errorContainer.style.borderRadius = '4px';
            this.errorContainer.style.textAlign = 'center';
            this.errorContainer.style.display = 'none';
            
            // Add retry button
            const retryButton = document.createElement('button');
            retryButton.textContent = 'Retry Connection';
            retryButton.style.marginTop = '5px';
            retryButton.style.padding = '5px 10px';
            retryButton.style.backgroundColor = '#2a1a0a';
            retryButton.style.color = '#c8a165';
            retryButton.style.border = '1px solid #8b5a2b';
            retryButton.style.borderRadius = '4px';
            retryButton.style.cursor = 'pointer';
            
            retryButton.addEventListener('click', () => {
                this.connectToServer();
                this.errorContainer.style.display = 'none';
            });
            
            this.errorContainer.appendChild(retryButton);
            
            // Insert at the top of the chat container
            this.chatContainer.insertBefore(this.errorContainer, this.chatContainer.firstChild);
        }
        
        // Set error message
        this.errorContainer.textContent = `Connection Error: ${message || 'Could not connect to chat server'}`;
        
        // Add retry button back
        const retryButton = document.createElement('button');
        retryButton.textContent = 'Retry Connection';
        retryButton.style.marginLeft = '10px';
        retryButton.style.padding = '5px 10px';
        retryButton.style.backgroundColor = '#2a1a0a';
        retryButton.style.color = '#c8a165';
        retryButton.style.border = '1px solid #8b5a2b';
        retryButton.style.borderRadius = '4px';
        retryButton.style.cursor = 'pointer';
        
        retryButton.addEventListener('click', () => {
            this.connectToServer();
            this.errorContainer.style.display = 'none';
        });
        
        this.errorContainer.appendChild(retryButton);
        
        // Show error container
        this.errorContainer.style.display = 'block';
    }
    
    /**
     * Clear connection error message
     */
    clearConnectionError() {
        if (this.errorContainer) {
            this.errorContainer.style.display = 'none';
        }
    }
    
    /**
     * Update room information in the UI
     */
    updateRoomInfo() {
        // Clear messages
        this.clearMessages();
        
        // Update panel title
        const room = this.rooms.find(r => r.id === this.currentRoom);
        if (room) {
            this.panel.setTitle(`Chat - ${room.name}${room.isPrivate ? ' 🔒' : ''}`);
        } else {
            this.panel.setTitle(`Chat - ${this.currentRoom}`);
        }
    }
}

// Export the ChatUI class
export default ChatUI; 