import { storage } from "@/lib/firebase/config";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

export const imageUploadService = {
    /**
     * Upload an image file to Firebase Storage.
     * @param path The path where the image should be stored (e.g., 'events/eventId.jpg')
     * @param file The File object from an input element
     */
    uploadImage: async (path: string, file: File): Promise<string> => {
        try {
            const storageRef = ref(storage, path);
            await uploadBytes(storageRef, file);
            return await getDownloadURL(storageRef);
        } catch (error) {
            console.error("Error uploading image:", error);
            throw error;
        }
    },

    /**
     * Delete an image from Firebase Storage.
     * @param path The path of the image to delete
     */
    deleteImage: async (path: string): Promise<void> => {
        try {
            const storageRef = ref(storage, path);
            await deleteObject(storageRef);
        } catch (error) {
            console.error("Error deleting image:", error);
            // Ignore errors if the file doesn't exist (e.g., object-not-found)
        }
    }
};
