import { UserItem, UserProfile } from "../types";

export function checkItemAccess(
    item: UserItem,
    viewerId: string | null,
    authorId: string,
    viewerRelationshipGroup: string | null,
    authorCustomGroups: { id: string; name: string; members: string[] }[] = []
): boolean {
    if (!item.isPrivate || item.visibility === 'public' || item.visibility === undefined) {
        return true;
    }

    if (!viewerId) return false;
    if (viewerId === authorId) return true;

    // Collect all groups the viewer belongs to
    const viewerGroups = new Set<string>();
    if (viewerRelationshipGroup) {
        viewerGroups.add(viewerRelationshipGroup);
        if (viewerRelationshipGroup === 'partner') {
            viewerGroups.add('family'); // partner inherits family
        }
    }
    
    // Add custom groups the viewer is in
    for (const cg of authorCustomGroups) {
        if (cg.members?.includes(viewerId)) {
            viewerGroups.add(cg.id);
        }
    }

    if (item.visibility === 'groups') {
        const allowed = item.allowedGroups || [];
        return allowed.some(g => viewerGroups.has(g));
    }

    if (item.visibility === 'custom') {
        if (item.customBase === 'public') {
            // Share with all except...
            if (item.excludedUsers?.includes(viewerId)) return false;
            
            const excluded = item.excludedGroups || [];
            if (excluded.some(g => viewerGroups.has(g))) return false;
            
            return true;
        } else if (item.customBase === 'private') {
            // Hide from all except...
            if (item.allowedUsers?.includes(viewerId)) return true;
            
            const allowed = item.allowedGroups || [];
            if (allowed.some(g => viewerGroups.has(g))) return true;
            
            return false;
        }
    }

    return false;
}
