import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { CACHE_KEYS, CACHE_TTL, DB_TABLES, COLUMNS, ERROR_MESSAGES, AVAILABLE_MODELS, Provider, getModelById } from '@/lib/constants';
import { Redis } from "@upstash/redis"

const redis = Redis.fromEnv()

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(ERROR_MESSAGES.UNAUTHORIZED, { status: ERROR_MESSAGES.UNAUTHORIZED.status });
    }

    const cachedSpace = await redis.get(CACHE_KEYS.spaces(user.id));
    if (cachedSpace) {
      const spaces = JSON.parse(cachedSpace as string); 
      const space = spaces.find((s: any) => s.id === id);
      if (space) {
        return NextResponse.json(space);
      }
    }

    const { data: space, error } = await supabase
      .from(DB_TABLES.SPACES)
      .select('*')
      .eq(COLUMNS.ID, id)
      .eq(COLUMNS.USER_ID, user.id)
      .single();

    if (error) {
      console.error('Error fetching space:', error);
      return NextResponse.json(ERROR_MESSAGES.SPACE_NOT_FOUND, { status: ERROR_MESSAGES.SPACE_NOT_FOUND.status });
    }

    // Get active space to determine if this space is active
    const { data: activeSpace } = await supabase
      .from(DB_TABLES.ACTIVE_SPACES)
      .select(COLUMNS.SPACE_ID)
      .eq(COLUMNS.USER_ID, user.id)
      .single();

    const spaceWithActive = {
      ...space,
      [COLUMNS.IS_ACTIVE]: activeSpace?.space_id === id
    };

    return NextResponse.json(spaceWithActive);
  } catch (err: any) {
    console.error('Error in space fetch:', err);
    return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR('Failed to fetch space'), { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(ERROR_MESSAGES.UNAUTHORIZED, { status: ERROR_MESSAGES.UNAUTHORIZED.status });
    }

    const body = await request.json();
    const { name, description, model, provider, setActive } = body;

    // Validate provider and model if they are being updated
    if (provider) {
      if (!Object.keys(AVAILABLE_MODELS).includes(provider)) {
        return NextResponse.json(ERROR_MESSAGES.INVALID_PROVIDER, { status: ERROR_MESSAGES.INVALID_PROVIDER.status });
      }

      if (model) {
        const selectedModel = getModelById(provider as Provider, model);
        if (!selectedModel) {
          return NextResponse.json(ERROR_MESSAGES.INVALID_MODEL, { status: ERROR_MESSAGES.INVALID_MODEL.status });
        }
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (name) updateData[COLUMNS.NAME] = name;
    if (description) updateData[COLUMNS.DESCRIPTION] = description;
    if (model) updateData[COLUMNS.MODEL] = model;
    if (provider) updateData[COLUMNS.PROVIDER] = provider;
    updateData[COLUMNS.UPDATED_AT] = new Date().toISOString();

    // Update space
    const { data: updatedSpace, error: updateError } = await supabase
      .from(DB_TABLES.SPACES)
      .update(updateData)
      .eq(COLUMNS.ID, id)
      .eq(COLUMNS.USER_ID, user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating space:', updateError);
      return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR(updateError.message), { status: 500 });
    }

    // Handle active space setting if requested
    if (setActive) {
      const { error: activeError } = await supabase
        .from(DB_TABLES.ACTIVE_SPACES)
        .upsert({
          [COLUMNS.USER_ID]: user.id,
          [COLUMNS.SPACE_ID]: id,
          [COLUMNS.UPDATED_AT]: new Date().toISOString()
        }, { onConflict: COLUMNS.USER_ID });

      if (activeError) {
        console.error('Error setting active space:', activeError);
        return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR(activeError.message), { status: 500 });
      }

      // Update cache for active space
      await redis.set(
        CACHE_KEYS.activeSpace(user.id),
        JSON.stringify({ ...updatedSpace, [COLUMNS.IS_ACTIVE]: true }),
        { ex: CACHE_TTL.ACTIVE_SPACE }
      );
    }

    // Invalidate spaces cache
    await redis.del(CACHE_KEYS.spaces(user.id));

    return NextResponse.json({ ...updatedSpace, [COLUMNS.IS_ACTIVE]: !!setActive });
  } catch (err: any) {
    console.error('Error in space update:', err);
    return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR('Failed to update space'), { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(ERROR_MESSAGES.UNAUTHORIZED, { status: ERROR_MESSAGES.UNAUTHORIZED.status });
    }
      
    // Soft delete the space
    const { error: deleteError } = await supabase
      .from(DB_TABLES.SPACES)
      .update({ [COLUMNS.IS_DELETED]: true })
      .eq(COLUMNS.ID, id)
      .eq(COLUMNS.USER_ID, user.id);

    if (deleteError) {
      console.error('Error deleting space:', deleteError);
      return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR(deleteError.message), { status: 500 });
    }

    // Remove from active spaces if it was active
    const { error: activeError } = await supabase
      .from(DB_TABLES.ACTIVE_SPACES)
      .delete()
      .eq(COLUMNS.USER_ID, user.id)
      .eq(COLUMNS.SPACE_ID, id);

    if (activeError) {
      console.error('Error removing from active spaces:', activeError);
      // Non-critical error, continue
    }

    // Invalidate caches
    await redis.del(CACHE_KEYS.spaces(user.id));
    await redis.del(CACHE_KEYS.activeSpace(user.id));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in space deletion:', err);
    return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR('Failed to delete space'), { status: 500 });
  }
}