import type { Community } from '../types/CommunityType'
import { insertOne, checkForDuplicate, deleteOne } from '../db'

export async function createCommunity(newCommunity: Community): Promise<boolean> {
    if (await checkForDuplicate('Communities', 'community_name', newCommunity.community_name)) {
        console.error('Community name already exists');
        return false;
    }
    else {
        await insertOne('Communities', newCommunity);
        console.log('Community created');
        console.table(newCommunity);
        return true;
    }    
}

export async function deleteCommunity(community_name: string) {
    await deleteOne('Communities', 'community_name', community_name);
    console.log('Community deleted');
}