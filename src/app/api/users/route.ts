import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/users - Get all users or search by username/email
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");
    const email = searchParams.get("email");
    const id = searchParams.get("id");

    let query = supabase.from("users").select("*");

    if (id) {
      query = query.eq("id", id);
      const { data, error } = await query.single();

      if (error) {
        if (error.code === "PGRST116") {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }
        throw error;
      }

      return NextResponse.json({ user: data });
    }

    if (username) {
      query = query.eq("username", username);
    }

    if (email) {
      query = query.eq("email", email);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ users: data });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const { username, email, name } = await request.json();

    if (!username || !email || !name) {
      return NextResponse.json(
        { error: "Username, email, and name are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("users")
      .insert([{ username, email, name }])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Username or email already exists" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ user: data }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

// PUT /api/users - Update a user
export async function PUT(request: NextRequest) {
  try {
    const { id, username, email, name } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (username !== undefined) updates.username = username;
    if (email !== undefined) updates.email = email;
    if (name !== undefined) updates.name = name;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "At least one field to update is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Username or email already exists" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ user: data });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE /api/users - Delete a user
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("users").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
