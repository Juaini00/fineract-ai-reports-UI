import { getToastConfig, resolveErrorToastMessage } from "@/app/config/api.config";
import type { ApiRequestConfig } from "../types";
import { toast } from "sonner";
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { formatApiError } from "../utils/api.utils";
import { instance } from "@/app/config/axios";
import { TOAST_MESSAGES } from "@/app/config/constants";




/**
 * ApiService class to handle HTTP requests with toast notifications
 */
class ApiService {
  /**
   * Generic HTTP GET request with toast notifications
   * @param config - Request configuration
   * @returns Promise with response data
   */
  async get<T = unknown>(config: ApiRequestConfig): Promise<T> {
    return this.executeRequest<T>('GET', config);
  }

  /**
   * Generic HTTP POST request with toast notifications
   * @param config - Request configuration
   * @param data - Request body data
   * @returns Promise with response data
   */
  async post<T = unknown, D = unknown>(
    config: ApiRequestConfig,
    data?: D
  ): Promise<T> {
    return this.executeRequest<T>('POST', config, data);
  }

  /**
   * Generic HTTP PUT request with toast notifications
   * @param config - Request configuration
   * @param data - Request body data
   * @returns Promise with response data
   */
  async put<T = unknown, D = unknown>(
    config: ApiRequestConfig,
    data?: D
  ): Promise<T> {
    return this.executeRequest<T>('PUT', config, data);
  }

  /**
   * Generic HTTP PATCH request with toast notifications
   * @param config - Request configuration
   * @param data - Request body data
   * @returns Promise with response data
   */
  async patch<T = unknown, D = unknown>(
    config: ApiRequestConfig,
    data?: D
  ): Promise<T> {
    return this.executeRequest<T>('PATCH', config, data);
  }

  /**
   * Generic HTTP DELETE request with toast notifications
   * @param config - Request configuration
   * @returns Promise with response data
   */
  async delete<T = unknown>(config: ApiRequestConfig): Promise<T> {
    return this.executeRequest<T>('DELETE', config);
  }

  /**
   * Execute HTTP request with unified error handling and toast notifications
   * @param method - HTTP method
   * @param config - Request configuration
   * @param data - Request body data (for POST, PUT, PATCH)
   * @returns Promise with response data
   */
  private async executeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    config: ApiRequestConfig,
    data?: unknown
  ): Promise<T> {
    const { url, showToast, silent, ...axiosConfig } = config;

    // Determine if we should show toasts
    const shouldShowToast = !silent;

    // Get toast messages
    const toastConfig = getToastConfig(showToast);
    let toastId: string | number | undefined;

    try {
      // Show loading toast if configured
      if (shouldShowToast && toastConfig.loading) {
        toastId = toast.loading(toastConfig.loading);
      }

      // Execute the request
      const response: AxiosResponse<T> = await this.makeRequest<T>(
        method,
        url,
        data,
        axiosConfig
      );

      // Dismiss loading toast and show success if configured
      if (shouldShowToast) {
        if (toastId) {
          toast.dismiss(toastId);
        }
        if (toastConfig.success) {
          toast.success(toastConfig.success);
        }
      }

      return response.data;
    } catch (error) {
      // Dismiss loading toast
      if (toastId) {
        toast.dismiss(toastId);
      }
      
      // Handle error and show error toast
      const apiError = formatApiError(error, method, url);

      if (shouldShowToast && toastConfig.error) {
        const errorMessage = resolveErrorToastMessage(apiError, toastConfig.error);
        toast.error(errorMessage);
      }

      throw apiError;
    }
  }

  /**
   * Make the actual HTTP request
   * @param method - HTTP method
   * @param url - Request URL
   * @param data - Request body data
   * @param config - Axios configuration
   * @returns Promise with response
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    switch (method) {
      case 'GET':
        return instance.get(url, config);
      case 'POST':
        return instance.post(url, data, config);
      case 'PUT':
        return instance.put(url, data, config);
      case 'PATCH':
        return instance.patch(url, data, config);
      case 'DELETE':
        return instance.delete(url, config);
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }

  /**
   * Helper method for promise-based operations with toast
   * @param promise - Promise to execute
   * @param messages - Toast messages for loading, success, and error
   * @returns Promise result
   */
  async withToast<T>(
    promise: Promise<T>,
    messages: {
      loading?: string;
      success?: string;
      error?: string;
    }
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      toast.promise(promise, {
        loading: messages.loading || TOAST_MESSAGES.loading,
        success: messages.success || TOAST_MESSAGES.success,
        error: messages.error || TOAST_MESSAGES.error,
      });
      
      promise.then(resolve).catch(reject);
    });
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export convenience functions for direct usage with toast integration
export const apiGet = <T = unknown>(config: ApiRequestConfig): Promise<T> =>
  apiService.get<T>(config);

export const apiPost = <T = unknown, D = unknown>(
  config: ApiRequestConfig,
  data?: D
): Promise<T> => apiService.post<T, D>(config, data);

export const apiPut = <T = unknown, D = unknown>(
  config: ApiRequestConfig,
  data?: D
): Promise<T> => apiService.put<T, D>(config, data);

export const apiPatch = <T = unknown, D = unknown>(
  config: ApiRequestConfig,
  data?: D
): Promise<T> => apiService.patch<T, D>(config, data);

export const apiDelete = <T = unknown>(config: ApiRequestConfig): Promise<T> =>
  apiService.delete<T>(config);

// Export the service class for advanced usage
export { ApiService };