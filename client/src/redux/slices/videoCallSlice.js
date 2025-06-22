import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    isInCall: false,
    incomingCall: null,
    activeCallUserId: null
};

const videoCallSlice = createSlice({
    name: 'videoCall',
    initialState,
    reducers: {
        setIncomingCall: (state, action) => {
            state.incomingCall = action.payload;
        },
        startCall: (state, action) => {
            state.isInCall = true;
            state.activeCallUserId = action.payload;
            state.incomingCall = null;
        },
        endCall: (state) => {
            state.isInCall = false;
            state.activeCallUserId = null;
            state.incomingCall = null;
        },
        rejectCall: (state) => {
            state.incomingCall = null;
        },
        setVideoCall: (state, action) => {
            state.isInCall = action.payload.isActive;
            if (action.payload.withUser) {
                state.activeCallUserId = action.payload.withUser._id;
            }
        }
    }
});

export const { setIncomingCall, startCall, endCall, rejectCall, setVideoCall } = videoCallSlice.actions;
export default videoCallSlice.reducer;