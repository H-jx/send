
/* eslint-disable */
export namespace FFSendNS {
    export interface App {
        Room: Room;
        Upload: Upload;
        Ping: Ping;
    }

    interface Room {
        join(roomId?: string): Promise<ResponseBody<{ roomId: string }>>;
        getRoomMessageHistory(roomId: string): Promise<ResponseBody<any>>;
    }

    export interface ResponseBody<T = any> {
        code: number;
        message: string;
        status: string;
        data?: T;
    }

    interface Upload {
        getUploadAction(query: {
            md5?: string
            fileName: string
            }): Promise<ResponseBody<{ upload?: string; download: string }>>;
    }

    interface Ping {
        ping(): Promise<ResponseBody<unknown>>;
    }
}

export type FFSend = FFSendNS.App;

