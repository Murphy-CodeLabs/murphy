import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ApiTableProps {
    children: React.ReactNode;
    className?: string;
}

interface ApiRowProps {
    children: React.ReactNode;
    className?: string;
}

interface ApiTablePropertyProps {
    name: string;
    type: string;
    optional?: boolean;
    required?: boolean;
    default?: string;
    description?: string;
    children?: React.ReactNode;
}

// Main ApiTable component
export function ApiTable({ children, className }: ApiTableProps) {
    return (
        <div className="my-6 w-full overflow-x-auto">
            <Table className={cn("w-full", className)}>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[180px]">Property</TableHead>
                        <TableHead className="w-[120px]">Type</TableHead>
                        <TableHead className="w-[100px]">Required</TableHead>
                        <TableHead>Description</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {children}
                </TableBody>
            </Table>
        </div>
    );
}

// Row component for API parameters
export function ApiRow({ children, className }: ApiRowProps) {
    return (
        <TableRow className={className}>
            {children}
        </TableRow>
    );
}

// Property component for API documentation
export function ApiTableProperty({
    name,
    type,
    optional = false,
    required = false,
    default: defaultValue,
    description,
    children
}: ApiTablePropertyProps) {
    const isRequired = required || !optional;

    return (
        <TableRow>
            <TableCell className="font-mono text-sm">
                <div className="flex items-center gap-2">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-medium">
                        {name}
                    </code>
                    {defaultValue && (
                        <Badge variant="outline" className="text-xs">
                            default: {defaultValue}
                        </Badge>
                    )}
                </div>
            </TableCell>

            <TableCell>
                <code className="rounded bg-muted px-1.5 py-0.5 text-sm text-blue-600 dark:text-blue-400">
                    {type}
                </code>
            </TableCell>

            <TableCell>
                {isRequired ? (
                    <Badge variant="destructive" className="text-xs">
                        required
                    </Badge>
                ) : (
                    <Badge variant="secondary" className="text-xs">
                        optional
                    </Badge>
                )}
            </TableCell>

            <TableCell className="text-sm">
                <div className="space-y-1">
                    {description && <p>{description}</p>}
                    {children}
                </div>
            </TableCell>
        </TableRow>
    );
}

// Legacy ApiParam component for backward compatibility
export function ApiParam({ name, type, required = false, description, children }: {
    name: string;
    type: string;
    required?: boolean;
    description?: string;
    children?: React.ReactNode;
}) {
    return (
        <ApiTableProperty
            name={name}
            type={type}
            required={required}
            description={description}
        >
            {children}
        </ApiTableProperty>
    );
}
