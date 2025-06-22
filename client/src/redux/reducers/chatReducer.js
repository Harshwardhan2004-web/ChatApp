// ...existing imports...
import {
    SET_MESSAGE_REQUESTS,
    UPDATE_MESSAGE_REQUEST,
    SET_VIDEO_CALL,
    // ...existing imports...
} from '../actions/chatActions';

const initialState = {
    // ...existing state...
    messageRequests: [],
    videoCall: {
        isActive: false,
        withUser: null,
        localStream: null,
        remoteStream: null,
        offer: null,
        answer: null
    }
};

export default function chatReducer(state = initialState, action) {
    switch (action.type) {
        // ...existing cases...
        
        case SET_MESSAGE_REQUESTS:
            return {
                ...state,
                messageRequests: action.payload
            };
            
        case UPDATE_MESSAGE_REQUEST:
            return {
                ...state,
                messageRequests: state.messageRequests.filter(
                    request => request._id !== action.payload.requestId
                )
            };
            
        case SET_VIDEO_CALL:
            return {
                ...state,
                videoCall: {
                    ...state.videoCall,
                    ...action.payload
                }
            };
            
        default:
            return state;
    }
}