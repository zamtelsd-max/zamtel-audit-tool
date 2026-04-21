import { TransferLog } from '../types';
import { format } from 'date-fns';

interface Props {
  transfers: TransferLog[];
}

function statusColor(status: string) {
  if (status === 'ACKNOWLEDGED') return 'bg-green-500';
  if (status === 'PENDING') return 'bg-yellow-400';
  return 'bg-gray-400';
}

export default function TransferTimeline({ transfers }: Props) {
  if (transfers.length === 0) {
    return <p className="text-gray-500 text-sm">No transfer history</p>;
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {transfers.map((transfer, idx) => (
          <li key={transfer.id}>
            <div className="relative pb-8">
              {idx < transfers.length - 1 && (
                <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
              )}
              <div className="relative flex space-x-3">
                <div>
                  <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${statusColor(transfer.status)}`}>
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className="text-sm text-gray-700">
                      {transfer.fromUser ? (
                        <span>
                          <span className="font-medium">{transfer.fromUser.name}</span> → <span className="font-medium">{transfer.toUser?.name}</span>
                        </span>
                      ) : (
                        <span>Initial assignment to <span className="font-medium">{transfer.toUser?.name}</span></span>
                      )}
                    </p>
                    {transfer.notes && <p className="text-xs text-gray-500 mt-0.5">{transfer.notes}</p>}
                    <span className={`mt-1 inline-flex text-xs px-2 py-0.5 rounded-full ${transfer.status === 'ACKNOWLEDGED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {transfer.status}
                    </span>
                  </div>
                  <div className="whitespace-nowrap text-right text-xs text-gray-500">
                    {format(new Date(transfer.timestamp), 'dd MMM yyyy HH:mm')}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
