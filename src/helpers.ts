import { AxiosInstance } from "axios";

// helpers
export async function logSub(days: number, ax: AxiosInstance) {
    const daysInSeconds = days*86400;
    const { data } = await ax({
        url: `/log/subscribe`,
        method: 'get',
        params: {
            filter: 'UserAuthenticated',
            include: `-${daysInSeconds}`
        }
    });
    return {
        subSuccess: data.success,
        id: data.result.id
    }
}

export async function logPull(sub: number, ax: AxiosInstance) {
    const { data } = await ax({
        url: '/log/pull',
        method: 'get',
        params: {
            id: sub
        }
    });
    return {
        pullSuccess: data.success, 
        result: data.result
    }
}

export async function fingerEnroll(reader: number, ax: AxiosInstance) {
    const { data } = await ax({
        method: 'post',
        url: 'fingerenroll/start',
        params: {
            reader
        }
    });
    return {
        success: data.success,
        session: data.result.session
    }
}

export async function fingerSub(ax: AxiosInstance) {
    const { data } = await ax({
        method: 'post',
        url: '/log/subscribe',
        params: {
            filter: 'FingerEnrollState',
            duration: 60
        }
    });
    if (data.success) {
        return data.result.id
    } else {
        return false
    }
}

export async function fingerUnsub(id: string, ax: AxiosInstance) {
    const { data } = await ax({
        method: 'post',
        url: '/log/unsubscribe',
        params: {
            id
        }
    });
    if (data.success) {
        return true
    }
}

export async function fingerResult(session: number, ax: AxiosInstance) {
    const { data } = await ax({
        method: 'post',
        url: 'fingerenroll/result',
        params: {
            session
        }
    });
    if (data.success) {
        return { 
            success: data.success,
            result: data.result.template
        }
    } else {
        return {
            success: data.success,
            result: data.error.code
        }
    }
}

export async function userAccess(id: string, params: {pin?: number, fpt?: string}, ax: AxiosInstance) {
    const formData = new FormData();
    formData.append('blob-dir_new', JSON.stringify({users:[{uuid:id, access:params}]}));
    const { data } = await ax({
        method: 'put',
        url: '/dir/update',
        data: formData,
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return data.success
}

export async function userDetails(id: string, ax: AxiosInstance) {
    const formData = new FormData();
    formData.append('blob-json', JSON.stringify({users:[{uuid: id}]}))
    const { data } = await ax({
        method: 'post',
        url: '/dir/get',
        data: formData,
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    if (data.success) {
        return data.result.users[0]
    };
}