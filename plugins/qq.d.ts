declare var navigation: {
    onnavigatesuccess: (e: any) => void;
    onnavigateerror: (e: any) => void;
    onnavigate: (e: any) => void;
} & EventTarget;

declare namespace QQ {
    type RenderToMainIPCMessage = (
        channel: string,
        msgHeader: IpcMsgHeader,
        msgDetail: [action?: string, data?: any]
    ) => void;
    type IpcMsgHeader = {
        type: "request" | "response";
        eventName: string;
        callbackId?: string;
        promiseStatue?: string;
    };
    
    interface MessageProps {
        isNewAio: boolean;
        uid: string;
        msgRecord: MsgRecord;
        pickerData: PickerData;
        focus: boolean;
        peerName: string;
        groupMap: GroupMap;
        msgListBarrierFree: MsgListBarrierFree;
        scene: number;
        align: string;
        showTime: boolean;
        showName: boolean;
        isLatestScreen: boolean;
        showPicker: boolean;
        isScrolling: boolean;
    }

    interface MsgRecord {
        msgId: string;
        msgRandom: string;
        msgSeq: string;
        cntSeq: string;
        chatType: number;
        msgType: number;
        subMsgType: number;
        sendType: number;
        senderUid: string;
        peerUid: string;
        channelId: string;
        guildId: string;
        guildCode: string;
        fromUid: string;
        fromAppid: string;
        msgTime: string;
        msgMeta: string;
        sendStatus: number;
        sendMemberName: string;
        sendNickName: string;
        guildName: string;
        channelName: string;
        elements: Element[];
        records: any[];
        emojiLikesList: any[];
        commentCnt: string;
        directMsgFlag: number;
        directMsgMembers: any[];
        peerName: string;
        editable: boolean;
        avatarMeta: string;
        avatarPendant: string;
        feedId: string;
        roleId: string;
        timeStamp: string;
        isImportMsg: boolean;
        atType: number;
        roleType: number;
        fromChannelRoleInfo: FromChannelRoleInfo;
        fromGuildRoleInfo: FromGuildRoleInfo;
        levelRoleInfo: LevelRoleInfo;
        recallTime: string;
        isOnlineMsg: boolean;
        generalFlags: string;
        clientSeq: string;
        nameType: number;
        avatarFlag: number;
    }

    interface Element {
        elementType: number;
        elementId: string;
        extBufForUI: string;
        textElement: TextElement;
    }

    interface TextElement {
        content: string;
        atType: number;
        atUid: string;
        atTinyId: string;
        atNtUid: string;
        subElementType: number;
        atChannelId: string;
        atRoleId: string;
        atRoleColor: number;
        atRoleName: string;
        needNotify: number;
    }

    interface FromChannelRoleInfo {
        roleId: string;
        name: string;
        color: number;
    }

    interface FromGuildRoleInfo {
        roleId: string;
        name: string;
        color: number;
    }

    interface LevelRoleInfo {
        roleId: string;
        name: string;
        color: number;
    }

    interface PickerData {}

    interface GroupMap {
        [key: string]: Group;
    }

    interface Group {
        groupCode: string;
        maxMember: number;
        memberCount: number;
        groupName: string;
        groupStatus: number;
        memberRole: number;
        isTop: boolean;
        toppedTimestamp: string;
        privilegeFlag: number;
        isConf: boolean;
        hasModifyConfGroupFace: boolean;
        hasModifyConfGroupName: boolean;
        remarkName: string;
        avatarUrl: string;
        hasMemo: boolean;
        groupShutupExpireTime: string;
        personShutupExpireTime: string;
        discussToGroupUin: string;
        discussToGroupMaxMsgSeq: number;
        discussToGroupTime: number;
    }

    interface MsgListBarrierFree {}
}
