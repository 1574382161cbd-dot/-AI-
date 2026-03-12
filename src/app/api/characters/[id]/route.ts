import { NextRequest, NextResponse } from "next/server";
import { characterManager } from "@/storage/database";
import { generateFileUrl } from "@/lib/ai";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const character = await characterManager.getCharacterById(id);

    if (!character) {
      return NextResponse.json(
        { success: false, error: "Character not found" },
        { status: 404 }
      );
    }

    // 生成图片的访问 URL（头像和三视图）
    const avatarUrl = character.avatarUrl ? await generateFileUrl(character.avatarUrl) : null;
    const frontViewUrl = character.frontViewUrl ? await generateFileUrl(character.frontViewUrl) : null;
    const sideViewUrl = character.sideViewUrl ? await generateFileUrl(character.sideViewUrl) : null;
    const threeQuarterViewUrl = character.threeQuarterViewUrl ? await generateFileUrl(character.threeQuarterViewUrl) : null;

    return NextResponse.json({
      success: true,
      data: {
        ...character,
        avatarUrl,
        frontViewUrl,
        sideViewUrl,
        threeQuarterViewUrl,
      },
    });
  } catch (error) {
    console.error("Error fetching character:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch character" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const character = await characterManager.updateCharacter(id, body);

    if (!character) {
      return NextResponse.json(
        { success: false, error: "Character not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: character });
  } catch (error) {
    console.error("Error updating character:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update character" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await characterManager.deleteCharacter(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Character not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting character:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete character" },
      { status: 500 }
    );
  }
}
