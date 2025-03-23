import { ApiErrorResponse, ApiSuccessResponse, ToastConfig } from '@/types/api';
import { BaseError } from '@/errors';

export class ResponseHelper {
  public success<T = any>(options: {
    data: T;
    toast?: ToastConfig;
    headers?: Record<string, string>;
    status?: number;
  }): Response {
    const { data, toast, headers = {}, status = 200 } = options;
    
    const responseBody: ApiSuccessResponse<T> = {
      data,
      ...(toast && { toast }),
    };

    return new Response(JSON.stringify(responseBody), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });
  }

  public error(
    errorOrMessage: string | Error | BaseError,
    statusCode: number = 500,
    toastConfig?: Omit<ToastConfig, 'variant'>
  ): Response {
    let message: string;
    let code: number = statusCode;
    let details: Record<string, any> | undefined;

    if (typeof errorOrMessage === 'string') {
      message = errorOrMessage;
    } else if (errorOrMessage instanceof BaseError) {
      message = errorOrMessage.message;
      code = errorOrMessage.statusCode;
      details = errorOrMessage.details;
    } else {
      message = errorOrMessage.message || 'An unexpected error occurred';
    }

    const toast: ToastConfig | undefined = toastConfig 
      ? { ...toastConfig, variant: 'error' }
      : {
          title: 'Error',
          description: message,
          variant: 'error',
        };

    const responseBody: ApiErrorResponse = {
      error: {
        message,
        code,
        ...(details && { details }),
      },
      toast,
    };

    return new Response(JSON.stringify(responseBody), {
      status: code,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}