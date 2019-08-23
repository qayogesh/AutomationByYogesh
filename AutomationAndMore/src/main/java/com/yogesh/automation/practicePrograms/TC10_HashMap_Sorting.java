package com.yogesh.automation.practicePrograms;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;

public class TC10_HashMap_Sorting {

	public static void main(String[] args) {

		HashMap<Integer, String> map = new HashMap<>();
		map.put(null, " Teacher");
		map.put(11, " Vivasvan");
		map.put(22, " John");
		map.put(33, " Yogesh");
		map.put(44, " Harshada");
		map.put(55, " Sagar");
		map.put(66, " Mike");
		map.put(77, " Tina");
		map.put(88, " Sammer");
		map.put(99, " Bob");
		map.put(100, " Bob");

		System.out.println(map);

		/**
		 * <k,v> keySet to get all key values enteryKey is set of key getValue
		 */
		for (Map.Entry m : map.entrySet()) {
			System.out.println(" key:" + m.getKey() + " value:" + m.getValue());
		}

		/**
		 * Prefix Good Morning to Even key and Good Afternoon to odd keys
		 */
		// this is not working
		for (Map.Entry m : map.entrySet()) {
			if (Integer.valueOf((String) m.getKey()) % 2 == 0) {
				System.out.println("Good Morning " + m.getValue() + "\n");
			} else {
				System.out.println("Good Afternoon " + m.getValue() + "\n");

			}
		}

		/**
		 * Sort 1. Using TreeMap 2. Using ArrayList - sort by key, sort by value 3.
		 * Using TreeSet - sort by key, sort by value 4. Using Lambda, stream
		 */

		// this is not working
		TreeMap<Integer, String> treeMap = new TreeMap<>();
		// treeMap.putAll(map);
		System.out.println("sorted using TreeMap \n");
		for (Map.Entry m : map.entrySet()) {
			System.out.println("key:" + m.getKey() + " value:" + m.getValue());
		}

		// ArrayList - by keySet
		// this is not working
		ArrayList<Integer> alkey = new ArrayList<>(map.keySet());
		// Collections.sort(alkey);
		System.out.println("sorted using ArrayList - by keySet: ");
		System.out.println("sorted using TreeMap \n");
		for (Map.Entry m : map.entrySet()) {
			System.out.println("key:" + m.getKey() + " value:" + m.getValue());
		}

		// TreeSet
		// this is not working
		TreeSet<Integer> treeSet = new TreeSet<>(map.keySet());
		for (Map.Entry m : map.entrySet()) {
			System.out.println("TreeSet key:" + m.getKey() + " TreeSet value:" + m.getValue());
		}
	}
}
