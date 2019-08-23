package com.yogesh.automation.practicePrograms;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.Iterator;
import java.util.ListIterator;

public class TC09_HashSet_Compare {

	public static void main(String[] args) {

		HashSet<String> hashset = new HashSet<>();
		hashset.add(" automation ");
		hashset.add("selenium ");
		hashset.add("protractor ");
		hashset.add("webdriver ");
		hashset.add("nightwatch ");
		hashset.add("selenium ");

		System.out.println(hashset);

		/**
		 * display hashset
		 */
		Iterator<String> itr = hashset.iterator();
		while (itr.hasNext()) {
			System.out.println(itr.next());
		}

		hashset.forEach(System.out::print);

		/**
		 * try to add null
		 */
		System.out.println();
		hashset.add(null);
		hashset.forEach(System.out::print); // method reference
		hashset.remove(null);

		/**
		 * ascending and descending order sort Convert Hashset to Array Use Collections
		 * on ArrayList
		 */
		ArrayList<String> arrayList = new ArrayList<>(hashset);
		Collections.sort(arrayList);
		System.out.println();
		System.out.println("ascending order sort " + arrayList);

		Collections.reverse(arrayList);
		System.out.println();
		System.out.println("descending order sort " + arrayList);
	}
}
