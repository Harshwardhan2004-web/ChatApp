import {
    // ...existing action types...
} from './actionTypes';

export const SET_MESSAGE_REQUESTS = 'SET_MESSAGE_REQUESTS';
export const UPDATE_MESSAGE_REQUEST = 'UPDATE_MESSAGE_REQUEST';
export const SET_VIDEO_CALL = 'SET_VIDEO_CALL';

// ...existing action creators...

export const setMessageRequests = (requests) => ({
    type: SET_MESSAGE_REQUESTS,
    payload: requests
});

export const updateMessageRequest = (requestId, status) => ({
    type: UPDATE_MESSAGE_REQUEST,
    payload: { requestId, status }
});

export const setVideoCall = (callState) => ({
    type: SET_VIDEO_CALL,
    payload: callState
});

// ...existing code...