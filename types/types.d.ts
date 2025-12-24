declare module 'lodash/debounce' {
    function debounce<T extends (...args: any[]) => any>(
        func: T,
        wait?: number,
        options?: {
            leading?: boolean;
            maxWait?: number;
            trailing?: boolean;
        }
    ): T & { cancel(): void; flush(): ReturnType<T>; };
    export default debounce;
}

declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.svg';

// Add missing NodeJS type
declare namespace NodeJS {
    interface Timeout {}
}

// Add Firebase types if needed
declare module 'firebase/firestore' {
    export type Timestamp = {
        toDate(): Date;
        seconds: number;
        nanoseconds: number;
        static now(): Timestamp;
    };
    
    export type DocumentData = { [field: string]: any };

    export type QueryDocumentSnapshot = {
        id: string;
        data(): DocumentData;
        ref: any;
    };

    export type QuerySnapshot<T = DocumentData> = {
        docs: QueryDocumentSnapshot[];
        forEach(callback: (doc: QueryDocumentSnapshot) => void): void;
    };

    export function collection(db: any, path: string): any;
    export function query(collection: any, ...constraints: any[]): any;
    export function where(field: string, op: string, value: any): any;
    export function orderBy(field: string, direction?: 'asc' | 'desc'): any;
    export function limit(n: number): any;
    export function getDocs(query: any): Promise<QuerySnapshot>;
    export function addDoc(collection: any, data: any): Promise<any>;
    export function updateDoc(ref: any, data: any): Promise<void>;
    export function doc(firestore: any, path: string, ...pathSegments: string[]): any;
    export function onSnapshot(
        query: any,
        onNext: (snapshot: QuerySnapshot) => void,
        onError?: (error: Error) => void
    ): () => void;
    export function serverTimestamp(): any;
}

// React Native Vector Icons type
declare module 'react-native-vector-icons/Ionicons' {
    import { Component } from 'react';
    export default class Icon extends Component<{
        name: string;
        size?: number;
        color?: string;
        style?: any;
    }> {}
}

// Firebase config type
declare module '../../lib/firebaseConfig' {
    export const db: any;
} 