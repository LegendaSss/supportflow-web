import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null

    // Calculate page range to show (max 5 pages)
    const getPageNumbers = () => {
        const pages = []
        let start = Math.max(1, currentPage - 2)
        let end = Math.min(totalPages, start + 4)

        // Adjust start if we're near the end
        if (end - start < 4) {
            start = Math.max(1, end - 4)
        }

        for (let i = start; i <= end; i++) {
            pages.push(i)
        }
        return pages
    }

    const pageNumbers = getPageNumbers()

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '8px',
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid var(--overlay-light)'
        }}>
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-arrow"
                aria-label="Previous page"
            >
                <ChevronLeft size={16} />
            </button>

            {pageNumbers[0] > 1 && (
                <>
                    <button onClick={() => onPageChange(1)} className="pagination-number">1</button>
                    {pageNumbers[0] > 2 && <span style={{ color: 'var(--text-muted)' }}>...</span>}
                </>
            )}

            {pageNumbers.map(page => (
                <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                >
                    {page}
                </button>
            ))}

            {pageNumbers[pageNumbers.length - 1] < totalPages && (
                <>
                    {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && <span style={{ color: 'var(--text-muted)' }}>...</span>}
                    <button onClick={() => onPageChange(totalPages)} className="pagination-number">{totalPages}</button>
                </>
            )}

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-arrow"
                aria-label="Next page"
            >
                <ChevronRight size={16} />
            </button>
        </div>
    )
}
