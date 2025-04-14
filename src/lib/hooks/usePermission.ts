import { useAuth } from "@/contexts/auth-context";

/**
 * Hook để kiểm tra quyền của người dùng
 * @returns Object chứa các hàm kiểm tra quyền
 */
export const usePermission = () => {
  const { user } = useAuth();

  /**
   * Kiểm tra xem người dùng có quyền cụ thể không
   * @param permission Tên quyền cần kiểm tra (ví dụ: project.create)
   * @returns true nếu có quyền, false nếu không
   */
  const hasPermission = (permission: string): boolean => {
    // Nếu không có user hoặc không có permissions, không có quyền
    if (!user || !user.permissions) return false;
    
    // Admin luôn có tất cả các quyền
    if (user.isAdmin) return true;
    
    // Kiểm tra quyền trong danh sách permissions của user
    return user.permissions.includes(permission);
  };

  /**
   * Kiểm tra xem người dùng có bất kỳ quyền nào trong danh sách không
   * @param permissions Danh sách các quyền cần kiểm tra
   * @returns true nếu có ít nhất một quyền, false nếu không có
   */
  const hasAnyPermission = (permissions: string[]): boolean => {
    // Nếu không có user hoặc không có permissions, không có quyền
    if (!user || !user.permissions) return false;
    
    // Admin luôn có tất cả các quyền
    if (user.isAdmin) return true;
    
    // Kiểm tra từng quyền trong danh sách
    return permissions.some(permission => user.permissions.includes(permission));
  };

  /**
   * Kiểm tra xem người dùng có tất cả các quyền trong danh sách không
   * @param permissions Danh sách các quyền cần kiểm tra
   * @returns true nếu có tất cả quyền, false nếu thiếu một quyền
   */
  const hasAllPermissions = (permissions: string[]): boolean => {
    // Nếu không có user hoặc không có permissions, không có quyền
    if (!user || !user.permissions) return false;
    
    // Admin luôn có tất cả các quyền
    if (user.isAdmin) return true;
    
    // Kiểm tra từng quyền trong danh sách
    return permissions.every(permission => user.permissions.includes(permission));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  };
}; 