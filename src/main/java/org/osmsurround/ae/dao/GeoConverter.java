/**
 * This file is part of Amenity Editor for OSM.
 * Copyright (c) 2001 by Adrian Stabiszewski, as@grundid.de
 *
 * Amenity Editor is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Amenity Editor is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Amenity Editor.  If not, see <http://www.gnu.org/licenses/>.
 */
package org.osmsurround.ae.dao;

import java.lang.Long.MIN_VALUE;
import java.lang.Long.MAX_VALUE;

public abstract class GeoConverter {

	private static final double DB_FACTOR = 10000000;

	public static long toDb(double value) {
		value = Math.round(value * DB_FACTOR);
		return value < Long.MIN_VALUE ? Long.MIN_VALUE
			: value > Long.MAX_VALUE ? Long.MAX_VALUE
			: (long)value;
	}

	public static double fromDb(long value) {
		return (double)value / DB_FACTOR;
	}
}
