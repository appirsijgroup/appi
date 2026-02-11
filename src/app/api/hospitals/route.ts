import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/hospitals
 * Fetch all hospitals or a specific hospital by ID
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (id) {
            // Get specific hospital
            const result = await query('SELECT * FROM hospitals WHERE id = $1', [id]);

            if (result.rows.length === 0) {
                return NextResponse.json({ error: 'Hospital not found' }, { status: 404 });
            }

            const data = result.rows[0];
            const hospital = {
                id: data.id,
                brand: data.brand,
                name: data.name,
                address: data.address,
                logo: data.logo,
                isActive: data.is_active
            };

            return NextResponse.json({ data: hospital });
        } else {
            // Get all hospitals
            const result = await query('SELECT * FROM hospitals ORDER BY brand');

            const hospitals = result.rows.map((item: any) => ({
                id: item.id,
                brand: item.brand,
                name: item.name,
                address: item.address,
                logo: item.logo,
                isActive: item.is_active
            }));

            return NextResponse.json({ data: hospitals });
        }
    } catch (error: any) {
        console.error('Error fetching hospitals:', error);
        return NextResponse.json(
            { error: 'Failed to fetch hospitals', details: error.message },
            { status: 500 }
        );
    }
}

/**
 * POST /api/hospitals
 * Create a new hospital
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { brand, name, address, logo, isActive } = body;

        if (!brand || !name) {
            return NextResponse.json(
                { error: 'Brand and name are required' },
                { status: 400 }
            );
        }

        // Generate ID from brand
        const id = brand.toUpperCase().replace(/\s+/g, '-') || `HOSP${Date.now()}`;

        const result = await query(
            `INSERT INTO hospitals (id, brand, name, address, logo, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *`,
            [id, brand, name, address || '', logo || null, isActive ?? true]
        );

        const data = result.rows[0];
        const hospital = {
            id: data.id,
            brand: data.brand,
            name: data.name,
            address: data.address,
            logo: data.logo,
            isActive: data.is_active
        };

        return NextResponse.json({ data: hospital }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating hospital:', error);
        return NextResponse.json(
            { error: 'Failed to create hospital', details: error.message },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/hospitals
 * Update an existing hospital
 */
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, brand, name, address, logo, isActive } = body;

        if (!id) {
            return NextResponse.json({ error: 'Hospital ID is required' }, { status: 400 });
        }

        // Build dynamic update query
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (brand !== undefined) {
            fields.push(`brand = $${paramIndex++}`);
            values.push(brand);
        }
        if (name !== undefined) {
            fields.push(`name = $${paramIndex++}`);
            values.push(name);
        }
        if (address !== undefined) {
            fields.push(`address = $${paramIndex++}`);
            values.push(address);
        }
        if (logo !== undefined) {
            fields.push(`logo = $${paramIndex++}`);
            values.push(logo);
        }
        if (isActive !== undefined) {
            fields.push(`is_active = $${paramIndex++}`);
            values.push(isActive);
        }

        if (fields.length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        values.push(id);

        const result = await query(
            `UPDATE hospitals SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Hospital not found' }, { status: 404 });
        }

        const data = result.rows[0];
        const hospital = {
            id: data.id,
            brand: data.brand,
            name: data.name,
            address: data.address,
            logo: data.logo,
            isActive: data.is_active
        };

        return NextResponse.json({ data: hospital });
    } catch (error: any) {
        console.error('Error updating hospital:', error);
        return NextResponse.json(
            { error: 'Failed to update hospital', details: error.message },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/hospitals
 * Delete a hospital
 */
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Hospital ID is required' }, { status: 400 });
        }

        await query('DELETE FROM hospitals WHERE id = $1', [id]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting hospital:', error);
        return NextResponse.json(
            { error: 'Failed to delete hospital', details: error.message },
            { status: 500 }
        );
    }
}
