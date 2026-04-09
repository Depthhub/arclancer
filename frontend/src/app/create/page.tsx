import { Suspense } from 'react';
import CreateContractClient from './CreateContractClient';

export default function CreateContractPage() {
    // useSearchParams() lives inside CreateContractClient, which must be under Suspense.
    return (
        <Suspense fallback={null}>
            <CreateContractClient />
        </Suspense>
    );
}
