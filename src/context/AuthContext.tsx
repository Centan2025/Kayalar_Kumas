import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type UserRole = 'ADMIN' | 'CUTTER' | 'TAILOR' | 'QC' | 'PACKAGER' | 'LOGISTICS';

export type Profile = {
    id: string;
    full_name: string;
    roles: string[]; // Array for multiple roles
};

type AuthContextType = {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    signOut: () => Promise<void>;
    loginBypass: (username?: string, roles?: string[]) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const loginBypass = (username: string = 'Cenk', roles: string[] = ['ADMIN']) => {
        localStorage.setItem('dev_admin_bypass', 'true');
        localStorage.setItem('dev_bypass_user', username);
        localStorage.setItem('dev_bypass_roles', JSON.stringify(roles));

        setUser({ id: 'dev-admin-id', email: `${username.toLowerCase()}@system.local` } as User);
        setProfile({
            id: 'dev-admin-id',
            full_name: `${username} (Bypass)`,
            roles: roles
        });
        setLoading(false);
    };

    useEffect(() => {
        const checkAuth = async () => {
            if (localStorage.getItem('dev_admin_bypass') === 'true') {
                const savedUser = localStorage.getItem('dev_bypass_user') || 'Cenk';
                const savedRoles = JSON.parse(localStorage.getItem('dev_bypass_roles') || '["ADMIN"]');
                loginBypass(savedUser, savedRoles);
                return;
            }

            const { data: { session: s } } = await supabase.auth.getSession();
            setSession(s);
            setUser(s?.user ?? null);
            if (s?.user) {
                await fetchProfile(s.user.id);
            } else {
                setLoading(false);
            }
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
            if (event === 'SIGNED_OUT') {
                localStorage.removeItem('dev_admin_bypass');
                localStorage.removeItem('dev_bypass_user');
                localStorage.removeItem('dev_bypass_roles');
                setProfile(null);
                setUser(null);
                setSession(null);
                setLoading(false);
                return;
            }

            setSession(s);
            setUser(s?.user ?? null);
            if (s?.user) {
                await fetchProfile(s.user.id);
            } else if (localStorage.getItem('dev_admin_bypass') !== 'true') {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;

            // Normalize roles: if it's a string, convert to array. If null, use empty array.
            const normalizedRoles = Array.isArray(data.roles)
                ? data.roles
                : (data.role ? [data.role] : []);

            setProfile({
                ...data,
                roles: normalizedRoles
            } as Profile);
        } catch (error) {
            console.error('Error fetching profile:', error);
            setProfile(null);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        localStorage.removeItem('dev_admin_bypass');
        localStorage.removeItem('dev_bypass_user');
        localStorage.removeItem('dev_bypass_roles');
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
        setSession(null);
    };

    const value = {
        session,
        user,
        profile,
        loading,
        signOut,
        loginBypass,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
